const router = require('express').Router();
const { Op, fn, col } = require('sequelize');
const { z } = require('zod');
const M = require('../models');
const { requirePerm, inScope, scopedPatient } = require('../middleware/auth');
const { audit, withPatients, sendMessage, fillTemplate, nextAppointment } = require('../services/core');
const { ah, D, pname, httpError } = require('../utils/helpers');

const scopedPids = async req => (await M.Patient.findAll({ where: inScope(req), attributes: ['id'], raw: true })).map(p => p.id);
const fmtDate = s => new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

/* =================== COMMUNICATION =================== */
router.get('/threads', requirePerm('comm.send'), ah(async (req, res) => {
  const pids = await scopedPids(req);
  const last = await M.Message.findAll({ attributes: ['patientId', [fn('MAX', col('at')), 'at']], where: { patientId: { [Op.in]: pids } }, group: ['patientId'], raw: true });
  const unread = Object.fromEntries((await M.Message.findAll({ attributes: ['patientId', [fn('COUNT', col('id')), 'n']], where: { patientId: { [Op.in]: pids }, dir: 'in', status: 'non_lu' }, group: ['patientId'], raw: true })).map(r => [r.patientId, +r.n]));
  const lastMsgs = await Promise.all(last.map(l => M.Message.findOne({ where: { patientId: l.patientId }, order: [['at', 'DESC']] })));
  const rows = await withPatients(lastMsgs.map(m => ({ patientId: m.patientId, last: m.toJSON(), unread: unread[m.patientId] || 0 })));
  res.json(rows.sort((a, b) => String(b.last.at).localeCompare(String(a.last.at))));
}));
router.get('/threads/:pid', requirePerm('comm.send'), ah(async (req, res) => {
  const p = await scopedPatient(req, req.params.pid);
  await M.Message.update({ status: 'lu' }, { where: { patientId: p.id, dir: 'in', status: 'non_lu' } });
  res.json({ patient: p, messages: await M.Message.findAll({ where: { patientId: p.id }, order: [['at', 'ASC']] }) });
}));
router.post('/messages', requirePerm('comm.send'), ah(async (req, res) => {
  const d = z.object({ patientId: z.string(), channel: z.enum(['chat', 'sms', 'email', 'whatsapp', 'notif']), text: z.string().trim().min(1).max(2000) }).parse(req.body);
  const p = await scopedPatient(req, d.patientId);
  const r = await sendMessage(p, d.text, d.channel);
  if (r.skipped) throw httpError(400, `${p.first} n’a pas consenti aux messages par ce canal`);
  await audit(req, `Message envoyé (${d.channel})`, pname(p)); res.status(201).json(r);
}));
router.get('/templates', requirePerm('comm.send'), ah(async (req, res) => res.json(await M.Template.findAll({ order: [['id', 'ASC']] }))));
router.post('/templates', requirePerm('comm.send'), ah(async (req, res) => { const d = z.object({ cat: z.string(), name: z.string(), text: z.string() }).parse(req.body); res.status(201).json(await M.Template.create(d)); }));
router.patch('/templates/:id', requirePerm('comm.send'), ah(async (req, res) => {
  const t = await M.Template.findByPk(req.params.id); if (!t) throw httpError(404, 'Modèle introuvable');
  Object.assign(t, z.object({ name: z.string().optional(), text: z.string().optional() }).parse(req.body)); await t.save(); res.json(t);
}));
router.post('/templates/preview', requirePerm('comm.send'), ah(async (req, res) => {
  const p = await scopedPatient(req, req.body.patientId); const na = await nextAppointment(p.id);
  const dn = na ? await M.User.findByPk(na.dentistId) : null;
  res.json({ text: await fillTemplate(req.body.text, p, na ? { date: fmtDate(na.date), heure: na.start.replace(':', 'h'), quand: fmtDate(na.date), dentiste: `${dn.title} ${dn.first} ${dn.last}` } : {}) });
}));
router.get('/reminder-rules', requirePerm('comm.send'), ah(async (req, res) => {
  const rules = await M.ReminderRule.findAll({ order: [['id', 'ASC']] });
  const pids = await scopedPids(req);
  const log = await withPatients(await M.Message.findAll({ where: { patientId: { [Op.in]: pids }, auto: true }, order: [['at', 'DESC']], limit: 10 }));
  res.json({ rules, log });
}));
router.patch('/reminder-rules/:id', requirePerm('comm.send'), ah(async (req, res) => {
  const r = await M.ReminderRule.findByPk(req.params.id); if (!r) throw httpError(404, 'Règle introuvable');
  const d = z.object({ on: z.boolean().optional(), channels: z.record(z.boolean()).optional() }).parse(req.body);
  if (d.on !== undefined) r.on = d.on; if (d.channels) r.channels = { ...r.channels, ...d.channels };
  await r.save(); await audit(req, 'Règle de rappel modifiée', r.name); res.json(r);
}));

/* =================== SUIVIS =================== */
router.get('/followups', requirePerm('agenda.view'), ah(async (req, res) => {
  const rows = await withPatients(await M.Followup.findAll({ where: { patientId: { [Op.in]: await scopedPids(req) } }, order: [['due', 'ASC']] }));
  res.json(rows);
}));
router.post('/followups/generate', requirePerm('agenda.view'), ah(async (req, res) => {
  const t = D.today(); let n = 0;
  const pats = await M.Patient.findAll({ where: inScope(req) });
  const open = await M.Followup.findAll({ where: { status: { [Op.ne]: 'fait' } }, raw: true });
  const exists = (pid, type) => open.some(f => f.patientId === pid && f.type === type);
  const appts = await M.Appointment.findAll({ where: { patientId: pats.map(p => p.id) }, attributes: ['patientId', 'date', 'type', 'status'], raw: true });
  const add = async (patientId, type, due, note) => { await M.Followup.create({ patientId, type, due, note, status: 'a_faire', auto: true }); open.push({ patientId, type }); n++; };
  for (const p of pats) {
    const ap = appts.filter(a => a.patientId === p.id);
    const future = ap.some(a => a.date >= t && ['confirme', 'attente'].includes(a.status));
    const lastCtrl = ap.filter(a => ['controle', 'detartrage', 'consultation'].includes(a.type) && a.status === 'termine').map(a => a.date).sort().pop();
    const ortho = p.tags.includes('Orthodontie');
    if (!ortho && !future && lastCtrl && D.diff(lastCtrl, t) > 150 && !exists(p.id, 'Contrôle 6 mois')) await add(p.id, 'Contrôle 6 mois', D.add(lastCtrl, 180) < t ? t : D.add(lastCtrl, 180), 'Généré automatiquement — aucun rendez-vous futur');
    if (ortho && !ap.some(a => a.date >= t && a.date <= D.add(t, 35) && a.type === 'orthodontie') && !exists(p.id, 'Contrôle orthodontique')) await add(p.id, 'Contrôle orthodontique', D.add(t, 7), 'Aucun contrôle planifié dans les 5 semaines');
  }
  const plans = await M.Plan.findAll({ where: { patientId: pats.map(p => p.id), status: { [Op.ne]: 'termine' } }, include: [{ model: M.PlanItem, as: 'items' }] });
  for (const pl of plans) if (pl.items.some(i => ['accepte', 'propose'].includes(i.status) && !i.planned) && !exists(pl.patientId, 'Relance plan de traitement')) await add(pl.patientId, 'Relance plan de traitement', t, `${pl.title} — étape non planifiée`);
  await audit(req, 'Analyse des suivis', `${n} tâche(s) créée(s)`); res.json({ created: n });
}));
router.patch('/followups/:id', requirePerm('agenda.view'), ah(async (req, res) => {
  const f = await M.Followup.findByPk(req.params.id); if (!f) throw httpError(404, 'Suivi introuvable'); await scopedPatient(req, f.patientId);
  f.status = z.object({ status: z.enum(['a_faire', 'relance', 'fait']) }).parse(req.body).status; await f.save(); res.json(f);
}));
router.post('/followups/:id/remind', requirePerm('comm.send'), ah(async (req, res) => {
  const f = await M.Followup.findByPk(req.params.id); if (!f) throw httpError(404, 'Suivi introuvable'); const p = await scopedPatient(req, f.patientId);
  const tpl = await M.Template.findByPk('t7'); await sendMessage(p, await fillTemplate(tpl.text, p), p.consent.whatsapp ? 'whatsapp' : 'sms', { auto: true });
  f.status = 'relance'; await f.save(); await audit(req, 'Rappel de suivi envoyé', pname(p)); res.json(f);
}));

/* =================== ABSENCES & NO-SHOW =================== */
router.get('/noshow', requirePerm('agenda.view'), ah(async (req, res) => {
  const t = D.today(); const from = D.add(t, -30);
  const ap = await M.Appointment.findAll({ where: { ...inScope(req), date: { [Op.between]: [from, t] } }, raw: true });
  const byDow = [1, 2, 3, 4, 5, 6].map(d => { const x = ap.filter(a => D.parse(a.date).getDay() === d); return x.length ? Math.round(x.filter(a => a.status === 'noshow').length / x.length * 1000) / 10 : 0; });
  const lateA = ap.filter(a => a.late);
  const risky = await M.Patient.findAll({ where: { ...inScope(req), noShows: { [Op.gte]: 2 } }, order: [['noShows', 'DESC']] });
  const next = await Promise.all(risky.map(p => nextAppointment(p.id)));
  res.json({
    counts: { annule: ap.filter(a => a.status === 'annule').length, moved: ap.filter(a => a.moved).length, noshow: ap.filter(a => a.status === 'noshow').length, late: lateA.length, lateAvg: Math.round(lateA.reduce((s, a) => s + a.late, 0) / (lateA.length || 1)), total: ap.length },
    byDow, risky: risky.map((p, i) => ({ ...p.toJSON(), nextAppt: next[i] }))
  });
}));
async function sendReinforced(p, a) {
  const clinic = await M.Clinic.findByPk(p.clinicId);
  return sendMessage(p, `Bonjour ${p.first}, votre rendez-vous du ${fmtDate(a.date)} à ${a.start.replace(':', 'h')} est réservé pour vous. Merci de confirmer votre présence en répondant OUI, ou de nous prévenir au ${clinic.phone} si vous ne pouvez pas venir.`, p.consent.whatsapp ? 'whatsapp' : 'sms', { auto: true });
}
router.post('/noshow/:pid/remind', requirePerm('comm.send'), ah(async (req, res) => {
  const p = await scopedPatient(req, req.params.pid); const a = await nextAppointment(p.id); if (!a) throw httpError(400, 'Aucun rendez-vous à venir');
  await sendReinforced(p, a); await audit(req, 'Rappel renforcé envoyé', pname(p)); res.json({ ok: true });
}));
router.post('/noshow/reinforce-all', requirePerm('comm.send'), ah(async (req, res) => {
  const risky = await M.Patient.findAll({ where: { ...inScope(req), noShows: { [Op.gte]: 2 } } }); let n = 0;
  for (const p of risky) { p.reinforced = true; await p.save(); const a = await nextAppointment(p.id); if (a) { await sendReinforced(p, a); n++; } }
  await audit(req, 'Rappels renforcés envoyés', `${n} patient(s)`); res.json({ activated: risky.length, sent: n });
}));

/* =================== AVIS & SATISFACTION =================== */
router.get('/reviews', requirePerm('patients.view'), ah(async (req, res) => {
  const all = await withPatients(await M.Review.findAll({ where: inScope(req), order: [['date', 'DESC']] }));
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i)); return D.ymd(d).slice(0, 7); });
  const avg = all.reduce((s, r) => s + r.rating, 0) / (all.length || 1);
  const dentists = await M.User.findAll({ where: { role: 'dentiste', clinicId: { [Op.in]: req.clinics } } });
  const todayDone = await M.Appointment.count({ where: { ...inScope(req), date: D.today(), status: 'termine' }, distinct: true, col: 'patient_id' });
  res.json({
    avg, count: all.length, five: Math.round(all.filter(r => r.rating === 5).length / (all.length || 1) * 100),
    evolution: months.map(m => { const x = all.filter(r => r.date.slice(0, 7) === m); return { m, n: x.length, avg: x.length ? +(x.reduce((s, r) => s + r.rating, 0) / x.length).toFixed(2) : +avg.toFixed(2) }; }),
    distribution: [5, 4, 3, 2, 1].map(n => ({ n, count: all.filter(r => r.rating === n).length })),
    byDentist: dentists.map(d => { const x = all.filter(r => r.dentistId === d.id); return { id: d.id, name: `${d.title} ${d.first} ${d.last}`, n: x.length, avg: x.reduce((s, r) => s + r.rating, 0) / (x.length || 1) }; }).filter(x => x.n),
    comments: all.filter(r => r.comment).slice(0, 40), todayDone
  });
}));
router.post('/reviews/request', requirePerm('comm.send'), ah(async (req, res) => {
  const done = await M.Appointment.findAll({ where: { ...inScope(req), date: D.today(), status: 'termine' }, raw: true });
  const tpl = await M.Template.findByPk('t8'); const ids = [...new Set(done.map(a => a.patientId))];
  for (const id of ids) { const p = await M.Patient.findByPk(id); await sendMessage(p, await fillTemplate(tpl.text, p), 'sms', { auto: true }); }
  await audit(req, 'Demandes d’avis envoyées', `${ids.length} patient(s)`); res.json({ sent: ids.length });
}));

module.exports = router;
