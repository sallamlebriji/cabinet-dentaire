const router = require('express').Router();
const { Op } = require('sequelize');
const { z } = require('zod');
const M = require('../models');
const { requirePerm, inScope, scopedPatient } = require('../middleware/auth');
const { audit, patientBalance, nextAppointment, decorateInvoices } = require('../services/core');
const { ah, D, pname, httpError } = require('../utils/helpers');

const list = s => (Array.isArray(s) ? s : String(s || '').split(',')).map(x => x.trim()).filter(Boolean);
const PatientIn = z.object({
  first: z.string().trim().min(1, 'requis'), last: z.string().trim().min(1, 'requis'), sex: z.enum(['F', 'M']).default('F'),
  dob: z.string().optional().nullable(), phone: z.string().trim().min(6, 'numéro invalide'), email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional().default(''), profession: z.string().optional().default(''), cover: z.string().optional().default(''), coverNo: z.string().optional().default(''),
  clinicId: z.string(), dentistId: z.string().optional(), emergency: z.object({ name: z.string().optional(), relation: z.string().optional(), phone: z.string().optional() }).partial().optional(),
  allergies: z.any().optional(), history: z.any().optional(), meds: z.any().optional(), tags: z.any().optional(),
  consent: z.record(z.boolean()).optional()
});

/* ---------- Liste ---------- */
router.get('/patients', requirePerm('patients.view'), ah(async (req, res) => {
  const { q = '', dentist, tag, sort = 'last', limit = 500 } = req.query;
  const where = { ...inScope(req) };
  if (dentist && dentist !== 'all') where.dentistId = dentist;
  if (q) where[Op.or] = ['first', 'last', 'phone', 'fileNo', 'email'].map(f => ({ [f]: { [Op.like]: `%${q}%` } }));
  let rows = (await M.Patient.findAll({ where, order: [['last', 'ASC'], ['first', 'ASC']], limit: +limit })).map(p => p.toJSON());
  if (tag === 'allergies') rows = rows.filter(p => p.allergies.length);
  else if (tag === 'nouveaux') rows = rows.filter(p => D.diff(p.createdOn, D.today()) <= 30);
  else if (tag && tag !== 'all' && tag !== 'solde') rows = rows.filter(p => p.tags.includes(tag));
  const ids = rows.map(p => p.id); const t = D.today();
  const [lastV, nextV, invs, pays] = await Promise.all([
    M.Appointment.findAll({ attributes: ['patientId', [M.sequelize.fn('MAX', M.sequelize.col('date')), 'd']], where: { patientId: ids, status: 'termine', date: { [Op.lte]: t } }, group: ['patientId'], raw: true }),
    M.Appointment.findAll({ where: { patientId: ids, date: { [Op.gte]: t }, status: { [Op.in]: ['confirme', 'attente'] } }, order: [['date', 'ASC'], ['start', 'ASC']], raw: true }),
    M.Invoice.findAll({ where: { patientId: ids } }), M.Payment.findAll({ attributes: ['patientId', [M.sequelize.fn('SUM', M.sequelize.col('amount')), 's']], where: { patientId: ids }, group: ['patientId'], raw: true })
  ]);
  const lv = Object.fromEntries(lastV.map(r => [r.patientId, r.d])); const nv = {}; nextV.forEach(a => { if (!nv[a.patientId]) nv[a.patientId] = a; });
  const tot = {}; invs.forEach(i => { tot[i.patientId] = (tot[i.patientId] || 0) + require('../services/core').invoiceTotal(i); });
  const paid = Object.fromEntries(pays.map(r => [r.patientId, parseFloat(r.s)]));
  rows = rows.map(p => ({ ...p, lastVisit: lv[p.id] || null, nextAppt: nv[p.id] ? { date: nv[p.id].date, start: nv[p.id].start } : null, due: (tot[p.id] || 0) - (paid[p.id] || 0) }));
  if (tag === 'solde') rows = rows.filter(p => p.due > 0);
  if (sort === 'visit') rows.sort((a, b) => String(b.lastVisit || '').localeCompare(String(a.lastVisit || '')));
  if (sort === 'due') rows.sort((a, b) => b.due - a.due);
  res.json(rows);
}));

router.post('/patients', requirePerm('patients.edit'), ah(async (req, res) => {
  const d = PatientIn.parse(req.body);
  if (!req.allowedClinics.includes(d.clinicId)) throw httpError(403, 'Cabinet non autorisé');
  const fileNo = await M.nextNumber('file', 'DOS-', 5);
  const p = await M.Patient.create({ ...d, email: d.email || '', allergies: list(d.allergies), history: list(d.history), meds: list(d.meds), tags: ['Nouveau'], fileNo, createdOn: D.today(), avatar: ['#2C6BCB', '#5E9F8D', '#7568D1', '#B89457', '#3AA6A0'][Math.floor(Math.random() * 5)], consent: { rgpd: true, sms: true, email: true, whatsapp: true, photos: false, ...(d.consent || {}) }, source: 'cabinet' });
  await audit(req, 'Patient créé', pname(p)); res.status(201).json(p);
}));

/* ---------- Fiche 360° ---------- */
router.get('/patients/:id', requirePerm('patients.view'), ah(async (req, res) => {
  const p = await scopedPatient(req, req.params.id); const out = p.toJSON();
  if (!req.can('clinical.view')) { out.history = null; out.meds = null; out.clinicalHidden = true; }
  const [visits, last, next, balance, plan, access] = await Promise.all([
    M.Appointment.count({ where: { patientId: p.id, status: 'termine' } }),
    M.Appointment.max('date', { where: { patientId: p.id, status: 'termine', date: { [Op.lte]: D.today() } } }),
    nextAppointment(p.id), patientBalance(p.id),
    M.Plan.findOne({ where: { patientId: p.id, status: { [Op.ne]: 'termine' } }, include: [{ model: M.PlanItem, as: 'items' }] }),
    M.AuditLog.findAll({ where: { target: { [Op.like]: `%${pname(p)}%` } }, order: [['at', 'DESC']], limit: 6 })
  ]);
  const counts = {
    dossier: await M.Consultation.count({ where: { patientId: p.id } }), imagerie: await M.Document.count({ where: { patientId: p.id } }),
    ordonnances: await M.Prescription.count({ where: { patientId: p.id } }), rdv: await M.Appointment.count({ where: { patientId: p.id } }), avantapres: await M.BeforeAfter.count({ where: { patientId: p.id } })
  };
  if (req.query.log !== '0') await audit(req, 'Consultation du dossier', pname(p) + (req.query.tab && req.query.tab !== 'apercu' ? ' — ' + req.query.tab : ''));
  res.json({ patient: out, stats: { visits, last, next, balance: req.can('finance.view') ? balance : null }, plan, access, counts });
}));

router.patch('/patients/:id', requirePerm('patients.edit'), ah(async (req, res) => {
  const p = await scopedPatient(req, req.params.id);
  const d = PatientIn.partial().parse(req.body);
  ['first', 'last', 'sex', 'dob', 'phone', 'email', 'address', 'profession', 'cover', 'coverNo', 'dentistId', 'emergency'].forEach(k => { if (d[k] !== undefined) p[k] = d[k]; });
  if (d.tags !== undefined) p.tags = list(d.tags);
  if (d.consent) p.consent = { ...p.consent, ...d.consent };
  if (req.body.notes !== undefined) p.notes = String(req.body.notes).slice(0, 5000);
  if (req.body.reinforced !== undefined) p.reinforced = !!req.body.reinforced;
  await p.save(); await audit(req, 'Fiche administrative modifiée', pname(p)); res.json(p);
}));
router.patch('/patients/:id/medical', requirePerm('clinical.edit'), ah(async (req, res) => {
  const p = await scopedPatient(req, req.params.id);
  p.history = list(req.body.history); p.allergies = list(req.body.allergies); p.meds = list(req.body.meds); p.smoker = !!req.body.smoker;
  await p.save(); await audit(req, 'Données médicales modifiées', pname(p)); res.json(p);
}));

/* ---------- Sous-ressources ---------- */
router.get('/patients/:id/appointments', requirePerm('patients.view'), ah(async (req, res) => {
  await scopedPatient(req, req.params.id);
  res.json(await M.Appointment.findAll({ where: { patientId: req.params.id }, order: [['date', 'DESC'], ['start', 'DESC']] }));
}));
router.get('/patients/:id/finances', requirePerm('finance.view'), ah(async (req, res) => {
  await scopedPatient(req, req.params.id);
  const [invoices, payments, balance] = await Promise.all([decorateInvoices(await M.Invoice.findAll({ where: { patientId: req.params.id }, order: [['date', 'DESC']] })), M.Payment.findAll({ where: { patientId: req.params.id }, order: [['date', 'DESC']] }), patientBalance(req.params.id)]);
  res.json({ invoices, payments, balance });
}));
router.get('/patients/:id/balance', requirePerm('finance.view'), ah(async (req, res) => { await scopedPatient(req, req.params.id); res.json(await patientBalance(req.params.id)); }));

module.exports = router;
