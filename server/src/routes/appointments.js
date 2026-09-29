const router = require('express').Router();
const { Op } = require('sequelize');
const { z } = require('zod');
const M = require('../models');
const { requirePerm, inScope, scopedPatient } = require('../middleware/auth');
const { audit, sendMessage, fillTemplate, conflict, freeSlots, withPatients, createInvoice, notify } = require('../services/core');
const { ah, D, pname, staffName, httpError } = require('../utils/helpers');

const fmtDate = s => new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const hh = t => t.replace(':', 'h');
const STATUS = ['confirme', 'attente', 'encours', 'termine', 'annule', 'noshow'];
const LABEL = { confirme: 'Confirmé', attente: 'En attente', encours: 'En cours', termine: 'Terminé', annule: 'Annulé', noshow: 'No-show' };

router.get('/appointments', requirePerm('agenda.view', 'patients.view'), ah(async (req, res) => {
  const { from = D.today(), to = from, dentist, patient } = req.query;
  const where = { ...inScope(req), date: { [Op.between]: [from, to] } };
  if (dentist && dentist !== 'all') where.dentistId = dentist;
  if (patient) where.patientId = patient;
  res.json(await withPatients(await M.Appointment.findAll({ where, order: [['date', 'ASC'], ['start', 'ASC']] })));
}));

router.get('/appointments/slots', requirePerm('agenda.view'), ah(async (req, res) => {
  const { dentist, date, dur = 30, ignore } = req.query;
  res.json(await freeSlots(dentist, date, +dur, { ignoreId: ignore }));
}));

router.get('/appointments/check', requirePerm('agenda.view'), ah(async (req, res) => {
  const c = await conflict(req.query, req.query.ignore);
  res.json({ conflict: c ? { start: c.start, patient: pname(await M.Patient.findByPk(c.patientId)) } : null });
}));

const ApptIn = z.object({ patientId: z.string(), dentistId: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), start: z.string().regex(/^\d{2}:\d{2}$/), dur: z.coerce.number().int().min(5).max(480), type: z.string(), status: z.enum(['confirme', 'attente']).default('attente'), chair: z.string().optional(), note: z.string().max(500).optional().default(''), notify: z.boolean().optional() });
router.post('/appointments', requirePerm('agenda.manage'), ah(async (req, res) => {
  const d = ApptIn.parse(req.body); const p = await scopedPatient(req, d.patientId); const dn = await M.User.findByPk(d.dentistId);
  if (!dn || !req.allowedClinics.includes(dn.clinicId)) throw httpError(400, 'Praticien invalide');
  const c = await conflict(d); if (c) throw httpError(409, `Chevauchement avec un rendez-vous à ${c.start}`);
  const a = await M.Appointment.create({ ...d, clinicId: dn.clinicId, chair: d.chair || dn.chair, source: 'cabinet' });
  if (d.notify) { const tpl = await M.Template.findByPk('t2'); await sendMessage(p, await fillTemplate(tpl.text, p, { dentiste: staffName(dn), date: fmtDate(a.date), heure: hh(a.start) }), 'sms', { auto: true }); }
  await audit(req, 'Rendez-vous créé', `${pname(p)} — ${a.date} ${a.start}`);
  res.status(201).json(a);
}));

/* Déplacement / reprogrammation / note */
router.patch('/appointments/:id', requirePerm('agenda.manage'), ah(async (req, res) => {
  const a = await M.Appointment.findOne({ where: { id: req.params.id, ...inScope(req) } }); if (!a) throw httpError(404, 'Rendez-vous introuvable');
  const d = z.object({ date: z.string().optional(), start: z.string().optional(), dentistId: z.string().optional(), chair: z.string().optional(), note: z.string().max(500).optional(), notifyPatient: z.boolean().optional() }).parse(req.body);
  const moving = (d.date && d.date !== a.date) || (d.start && d.start !== a.start) || (d.dentistId && d.dentistId !== a.dentistId);
  if (moving) {
    const target = { dentistId: d.dentistId || a.dentistId, date: d.date || a.date, start: d.start || a.start, dur: a.dur };
    const c = await conflict(target, a.id); if (c) throw httpError(409, `Conflit avec un rendez-vous à ${c.start}`);
    const before = `${a.date} ${a.start}`;
    if (d.dentistId && d.dentistId !== a.dentistId) { const dn = await M.User.findByPk(d.dentistId); a.dentistId = dn.id; a.clinicId = dn.clinicId; a.chair = d.chair || dn.chair; }
    a.date = target.date; a.start = target.start; a.moved = true; if (a.status === 'confirme') a.status = 'attente';
    const p = await M.Patient.findByPk(a.patientId);
    if (d.notifyPatient !== false) await sendMessage(p, `Bonjour ${p.first}, votre rendez-vous a été déplacé au ${fmtDate(a.date)} à ${hh(a.start)}. Répondez OUI pour confirmer.`, 'sms', { auto: true });
    await audit(req, 'Rendez-vous déplacé', `${pname(p)} : ${before} → ${a.date} ${a.start}`);
  }
  if (d.chair && !d.dentistId) a.chair = d.chair;
  if (d.note !== undefined) a.note = d.note;
  await a.save(); res.json(a);
}));

/* Changement de statut (effets : compteur no-show, facture automatique en fin de séance) */
router.post('/appointments/:id/status', requirePerm('agenda.manage'), ah(async (req, res) => {
  const { status } = z.object({ status: z.enum(STATUS) }).parse(req.body);
  const a = await M.Appointment.findOne({ where: { id: req.params.id, ...inScope(req) } }); if (!a) throw httpError(404, 'Rendez-vous introuvable');
  const p = await M.Patient.findByPk(a.patientId); const prev = a.status; a.status = status; await a.save();
  let invoice = null;
  if (status === 'noshow' && prev !== 'noshow') { p.noShows += 1; if (p.noShows >= 2 && !p.tags.includes('Risque no-show')) p.tags = [...p.tags, 'Risque no-show']; await p.save(); }
  if (status === 'termine' && !(await M.Invoice.findOne({ where: { apptId: a.id } }))) {
    const types = (await M.Setting.findByPk('types')).value; const t = types[a.type];
    invoice = await createInvoice({ patient: p, dentistId: a.dentistId, items: [{ label: t.label, tooth: '', qty: 1, price: t.price }], apptId: a.id });
  }
  await audit(req, 'Statut rendez-vous → ' + LABEL[status], `${pname(p)} — ${a.date} ${a.start}`);
  res.json({ appointment: a, invoice });
}));

router.post('/appointments/:id/remind', requirePerm('comm.send'), ah(async (req, res) => {
  const a = await M.Appointment.findOne({ where: { id: req.params.id, ...inScope(req) } }); if (!a) throw httpError(404, 'Rendez-vous introuvable');
  const p = await M.Patient.findByPk(a.patientId); const dn = await M.User.findByPk(a.dentistId); const tpl = await M.Template.findByPk('t1');
  const days = D.diff(D.today(), a.date); const quand = days === 0 ? 'aujourd’hui' : days === 1 ? 'demain' : 'le ' + fmtDate(a.date);
  const ch = p.consent.whatsapp ? 'whatsapp' : 'sms';
  const r = await sendMessage(p, await fillTemplate(tpl.text, p, { dentiste: staffName(dn), quand, heure: hh(a.start) }), ch);
  if (r.skipped) throw httpError(400, 'Le patient n’a pas consenti aux rappels');
  await audit(req, 'Rappel envoyé', pname(p)); res.json({ channel: ch });
}));

router.get('/appointments/:id', requirePerm('agenda.view', 'patients.view'), ah(async (req, res) => {
  const a = await M.Appointment.findOne({ where: { id: req.params.id, ...inScope(req) } }); if (!a) throw httpError(404, 'Rendez-vous introuvable');
  const [d] = await withPatients([a]); const inv = await M.Invoice.findOne({ where: { apptId: a.id }, attributes: ['id', 'number'] });
  res.json({ ...d, invoice: inv });
}));

module.exports = router;
