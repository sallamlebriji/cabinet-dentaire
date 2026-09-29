const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const M = require('../models');
const { scopedPatient } = require('../middleware/auth');
const { audit, sendMessage } = require('../services/core');
const assistant = require('../services/assistant');
const { ah, D, pname, httpError } = require('../utils/helpers');

const limiter = rateLimit({ windowMs: 60 * 1000, limit: 20, message: { error: 'Trop de requêtes à l’assistant, patientez une minute.' } });

router.get('/assistant/status', ah(async (req, res) => res.json({ engine: assistant.engine() })));

router.post('/assistant/run', limiter, ah(async (req, res) => {
  const d = z.object({ task: z.enum(['summary', 'notes', 'report', 'followups', 'agenda', 'reminder', 'template', 'ask']), patientId: z.string().optional(), text: z.string().max(8000).optional(), kind: z.string().optional() }).parse(req.body);
  if (d.patientId) await scopedPatient(req, d.patientId);
  const out = d.task === 'ask' ? await assistant.ask(req, d.text || '') : await assistant.run(req, d.task, d);
  await audit(req, 'Assistant IA — ' + d.task, d.patientId ? pname(await M.Patient.findByPk(d.patientId)) : '');
  res.json(out);
}));

/* Actions proposées par l'assistant (toujours confirmées par un humain côté interface) */
router.post('/assistant/action', ah(async (req, res) => {
  const d = z.object({ action: z.enum(['confirmTomorrow', 'sendReminder', 'saveTemplate']), date: z.string().optional(), patientId: z.string().optional(), message: z.string().max(2000).optional(), channel: z.enum(['sms', 'whatsapp']).optional(), name: z.string().optional() }).parse(req.body);
  if (d.action === 'confirmTomorrow') {
    if (!req.can('comm.send')) throw httpError(403, 'Permission requise : communication patient');
    const list = await M.Appointment.findAll({ where: { clinicId: req.clinics, date: d.date || D.add(D.today(), 1), status: 'attente' } }); let n = 0;
    for (const a of list) { const p = await M.Patient.findByPk(a.patientId); const r = await sendMessage(p, `Bonjour ${p.first}, merci de confirmer votre rendez-vous de demain à ${a.start.replace(':', 'h')} en répondant OUI.`, p.consent.whatsapp ? 'whatsapp' : 'sms', { auto: true }); if (!r.skipped) n++; }
    await audit(req, 'Demandes de confirmation envoyées (assistant)', `${n} patient(s)`); return res.json({ sent: n });
  }
  if (d.action === 'sendReminder') {
    if (!req.can('comm.send')) throw httpError(403, 'Permission requise : communication patient');
    const p = await scopedPatient(req, d.patientId); const r = await sendMessage(p, d.message, d.channel || 'sms');
    if (r.skipped) throw httpError(400, 'Le patient n’a pas consenti à ce canal');
    await audit(req, 'Rappel envoyé (assistant)', pname(p)); return res.json({ ok: true });
  }
  const t = await M.Template.create({ cat: 'Assistant', name: d.name || 'Modèle', text: d.message }); res.json(t);
}));

module.exports = router;
