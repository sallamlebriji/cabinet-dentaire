/* Portail patient : authentification par code SMS (OTP) + données strictement limitées au patient connecté */
const router = require('express').Router();
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { Op } = require('sequelize');
const { z } = require('zod');
const cfg = require('../config');
const M = require('../models');
const { requirePatient, openSession, closeSession } = require('../middleware/auth');
const { audit, notify, sendMessage, patientBalance, decorateInvoices, freeSlots, nextAppointment } = require('../services/core');
const { upload } = require('./documents');
const { ah, D, pname, staffName, money, httpError } = require('../utils/helpers');

const otpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, message: { error: 'Trop de demandes de code, réessayez plus tard.' } });
const digits = s => String(s || '').replace(/\D/g, '');
const mask = ph => ph.slice(0, 2) + ' •• •• ' + ph.slice(-5);
const hh = t => t.replace(':', 'h');
const fmtDate = s => new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

/* ---------- Connexion ---------- */
async function findByPhone(phone) { const d = digits(phone); if (d.length < 9) return null; return M.Patient.findOne({ where: M.sequelize.where(M.sequelize.fn('REPLACE', M.sequelize.col('phone'), ' ', ''), d) }); }
router.post('/otp/request', otpLimiter, ah(async (req, res) => {
  const { phone } = z.object({ phone: z.string() }).parse(req.body);
  const p = await findByPhone(phone); const out = { ok: true, masked: mask(digits(phone).replace(/(\d{2})(?=\d)/g, '$1 ').trim()) };
  if (p) {
    const code = String(crypto.randomInt(100000, 1000000));
    await M.PatientOtp.destroy({ where: { patientId: p.id } });
    await M.PatientOtp.create({ patientId: p.id, codeHash: await bcrypt.hash(code, 8), expiresAt: new Date(Date.now() + 10 * 60000), attempts: 0 });
    console.log(`[SMS → ${p.phone}] Votre code de connexion Nacre : ${code} (valable 10 min)`);
    if (!cfg.isProd) out.devCode = code; // facilite les tests en local uniquement
  }
  res.json(out); // réponse identique que le numéro existe ou non (pas d'énumération)
}));
router.post('/otp/verify', otpLimiter, ah(async (req, res) => {
  const { phone, code } = z.object({ phone: z.string(), code: z.string().regex(/^\d{6}$/, 'Le code comporte 6 chiffres') }).parse(req.body);
  const p = await findByPhone(phone); const otp = p && await M.PatientOtp.findOne({ where: { patientId: p.id } });
  if (!otp || otp.expiresAt < new Date() || otp.attempts >= 5) throw httpError(401, 'Code expiré — demandez un nouveau code');
  if (!(await bcrypt.compare(code, otp.codeHash))) { otp.attempts += 1; await otp.save(); throw httpError(401, 'Code incorrect'); }
  await otp.destroy(); await openSession(req, res, { kind: 'patient', patientId: p.id });
  req.patient = p; await audit(req, 'Connexion portail patient', 'Code SMS'); res.json({ ok: true });
}));
/* Accès démo direct (désactivé en production) */
router.post('/demo', ah(async (req, res) => {
  if (cfg.isProd) throw httpError(404, 'Route introuvable');
  const p = await M.Patient.findByPk(req.body.patientId); if (!p) throw httpError(404, 'Patient introuvable');
  await openSession(req, res, { kind: 'patient', patientId: p.id }); req.patient = p; await audit(req, 'Connexion portail patient', 'Démo'); res.json({ ok: true });
}));
router.get('/demo-accounts', ah(async (req, res) => {
  if (cfg.isProd) return res.json([]);
  res.json(await M.Patient.findAll({ where: { id: ['p1', 'p12', 'p14', 'p15'] }, attributes: ['id', 'first', 'last', 'phone'] }));
}));
router.post('/logout', ah(async (req, res) => { await closeSession(req, res, 'patient'); res.json({ ok: true }); }));

router.use(requirePatient);
const safe = p => { const o = p.toJSON(); ['notes', 'noShows', 'lateCount', 'reinforced', 'tags', 'history', 'meds', 'source'].forEach(k => delete o[k]); return o; };

/* ---------- Référentiels pour l'affichage et les documents ---------- */
router.get('/meta', ah(async (req, res) => {
  const [g, types, clinics, staff] = await Promise.all([M.Setting.findByPk('general'), M.Setting.findByPk('types'), M.Clinic.findAll(), M.User.findAll({ where: { role: 'dentiste' }, attributes: ['id', 'first', 'last', 'title', 'spec', 'clinicId', 'color', 'chair'] })]);
  res.json({ general: g.value, types: types.value, clinics, staff });
}));

/* ---------- Accueil ---------- */
router.get('/me', ah(async (req, res) => {
  const p = req.patient;
  const [na, bal, plan, quote, notifs, unread, clinic] = await Promise.all([
    nextAppointment(p.id), patientBalance(p.id),
    M.Plan.findOne({ where: { patientId: p.id, status: { [Op.ne]: 'termine' } }, include: [{ model: M.PlanItem, as: 'items' }] }),
    M.Quote.findOne({ where: { patientId: p.id, status: 'envoye', valid: { [Op.gte]: D.today() } } }),
    M.Message.findAll({ where: { patientId: p.id, dir: 'out' }, order: [['at', 'DESC']], limit: 5 }),
    M.Message.count({ where: { patientId: p.id, dir: 'out', seen: false } }), M.Clinic.findByPk(p.clinicId)
  ]);
  const dn = na ? await M.User.findByPk(na.dentistId) : null;
  res.json({ patient: safe(p), clinic, next: na ? { ...na.toJSON(), dentistName: staffName(dn) } : null, balance: bal, plan, quote, notifications: notifs, unread });
}));

/* ---------- Rendez-vous ---------- */
async function myAppt(req) { const a = await M.Appointment.findOne({ where: { id: req.params.id, patientId: req.patient.id } }); if (!a) throw httpError(404, 'Rendez-vous introuvable'); return a; }
const hoursUntil = a => (new Date(`${a.date}T${a.start}:00`) - Date.now()) / 3600e3;
router.get('/appointments', ah(async (req, res) => {
  const list = await M.Appointment.findAll({ where: { patientId: req.patient.id }, order: [['date', 'DESC'], ['start', 'DESC']] });
  const staff = Object.fromEntries((await M.User.findAll({ where: { id: [...new Set(list.map(a => a.dentistId))] } })).map(u => [u.id, u]));
  res.json(list.map(a => ({ ...a.toJSON(), dentistName: staffName(staff[a.dentistId]), dentistColor: staff[a.dentistId] && staff[a.dentistId].color, hoursUntil: hoursUntil(a) })));
}));
router.post('/appointments/:id/confirm', ah(async (req, res) => {
  const a = await myAppt(req); if (!['attente', 'confirme'].includes(a.status)) throw httpError(400, 'Rendez-vous non confirmable');
  a.status = 'confirme'; await a.save();
  await notify(a.clinicId, { kind: 'booking', title: 'Présence confirmée', text: `${pname(req.patient)} a confirmé son RDV du ${a.date} à ${a.start}.`, link: '/agenda' });
  await audit(req, 'Confirmation de présence', `${a.date} ${a.start}`); res.json(a);
}));
router.post('/appointments/:id/cancel', ah(async (req, res) => {
  const a = await myAppt(req); if (hoursUntil(a) < 24) throw httpError(400, 'Moins de 24h avant le rendez-vous : merci de contacter le cabinet');
  a.status = 'annule'; await a.save();
  await notify(a.clinicId, { kind: 'alert', title: 'Annulation par le patient', text: `${pname(req.patient)} — ${a.date} ${a.start}`, link: '/agenda' });
  await audit(req, 'Rendez-vous annulé (portail)', `${a.date} ${a.start}`); res.json(a);
}));
router.get('/appointments/:id/days', ah(async (req, res) => {
  const a = await myAppt(req); const out = []; let d = D.add(D.today(), 1);
  while (out.length < 14) { if (D.parse(d).getDay() !== 0) out.push({ date: d, slots: await freeSlots(a.dentistId, d, a.dur, { ignoreId: a.id }) }); d = D.add(d, 1); }
  res.json(out);
}));
router.post('/appointments/:id/move', ah(async (req, res) => {
  const a = await myAppt(req); const { date, time } = z.object({ date: z.string(), time: z.string() }).parse(req.body);
  if (hoursUntil(a) < 24) throw httpError(400, 'Moins de 24h avant le rendez-vous : merci de contacter le cabinet');
  if (!(await freeSlots(a.dentistId, date, a.dur, { ignoreId: a.id })).includes(time)) throw httpError(409, 'Ce créneau n’est plus disponible');
  a.date = date; a.start = time; a.moved = true; a.status = 'confirme'; await a.save();
  await sendMessage(req.patient, `Votre rendez-vous a bien été déplacé au ${fmtDate(date)} à ${hh(time)}.`, 'sms', { auto: true, force: true });
  await notify(a.clinicId, { kind: 'booking', title: 'Rendez-vous modifié par le patient', text: `${pname(req.patient)} → ${date} à ${time}`, link: '/agenda' });
  await audit(req, 'Rendez-vous déplacé (portail)', `${date} ${time}`); res.json(a);
}));

/* ---------- Traitement & devis ---------- */
router.get('/plans', ah(async (req, res) => {
  const plans = await M.Plan.findAll({ where: { patientId: req.patient.id }, include: [{ model: M.PlanItem, as: 'items' }], order: [['createdOn', 'DESC'], [{ model: M.PlanItem, as: 'items' }, 'position', 'ASC']] });
  const quotes = await M.Quote.findAll({ where: { patientId: req.patient.id, status: { [Op.ne]: 'brouillon' } }, order: [['date', 'DESC']] });
  const staff = Object.fromEntries((await M.User.findAll({ where: { role: 'dentiste' } })).map(u => [u.id, staffName(u)]));
  res.json({ plans: plans.map(p => ({ ...p.toJSON(), dentistName: staff[p.dentistId] })), quotes });
}));
router.post('/quotes/:id/accept', ah(async (req, res) => {
  const q = await M.Quote.findOne({ where: { id: req.params.id, patientId: req.patient.id } }); if (!q) throw httpError(404, 'Devis introuvable');
  if (q.status !== 'envoye' || q.valid < D.today()) throw httpError(400, 'Ce devis ne peut plus être accepté');
  const { signature, agree } = z.object({ signature: z.string().trim().min(3, 'Signature requise'), agree: z.literal(true, { errorMap: () => ({ message: 'Accord requis' }) }) }).parse(req.body);
  q.status = 'accepte'; q.acceptedAt = D.today(); q.signature = signature; await q.save();
  await notify(req.patient.clinicId, { kind: 'alert', title: 'Devis accepté en ligne', text: `${pname(req.patient)} a signé le devis ${q.number}.`, link: '/devis/' + q.id });
  await audit(req, 'Devis accepté en ligne (signature électronique)', `${q.number} — ${signature} — IP ${req.ip}`); res.json(q);
}));

/* ---------- Documents ---------- */
router.get('/documents', ah(async (req, res) => {
  const pid = req.patient.id;
  const [docs, rx, ba] = await Promise.all([M.Document.findAll({ where: { patientId: pid, [Op.or]: [{ shared: true }, { fromPortal: true }] }, order: [['date', 'DESC']] }), M.Prescription.findAll({ where: { patientId: pid }, order: [['date', 'DESC']] }), M.BeforeAfter.findAll({ where: { patientId: pid, visibility: 'patient', consent: true } })]);
  res.json({ docs: docs.map(d => { const o = d.toJSON(); delete o.filePath; o.hasFile = !!d.filePath; return o; }), prescriptions: rx, beforeAfter: ba });
}));
router.get('/documents/:id/file', ah(async (req, res) => {
  const d = await M.Document.findOne({ where: { id: req.params.id, patientId: req.patient.id, [Op.or]: [{ shared: true }, { fromPortal: true }] } });
  if (!d || !d.filePath) throw httpError(404, 'Fichier introuvable');
  res.type(d.mime); res.sendFile(path.resolve(cfg.uploadDir, d.filePath));
}));
router.post('/documents', upload.single('file'), ah(async (req, res) => {
  const f = req.file; if (!f) throw httpError(400, 'Aucun fichier reçu');
  const d = await M.Document.create({ patientId: req.patient.id, kind: f.mimetype === 'application/pdf' ? 'pdf' : 'upload', title: path.basename(f.originalname, path.extname(f.originalname)).slice(0, 190), date: D.today(), cat: f.mimetype === 'application/pdf' ? 'pdf' : 'photo', seed: 1, fromPortal: true, reviewed: false, shared: false, filePath: path.relative(cfg.uploadDir, f.path), mime: f.mimetype, size: f.size });
  await notify(req.patient.clinicId, { kind: 'msg', title: 'Document reçu via le portail', text: `${pname(req.patient)} a envoyé « ${f.originalname} ».`, link: '/radiographies' });
  await audit(req, 'Document envoyé (portail)', f.originalname); res.status(201).json({ id: d.id });
}));

/* ---------- Factures & paiement en ligne ---------- */
router.get('/invoices', ah(async (req, res) => {
  const pid = req.patient.id;
  res.json({ invoices: await decorateInvoices(await M.Invoice.findAll({ where: { patientId: pid }, order: [['date', 'DESC']] })), payments: await M.Payment.findAll({ where: { patientId: pid }, order: [['date', 'DESC']] }), balance: await patientBalance(pid) });
}));
router.post('/invoices/:id/pay', ah(async (req, res) => {
  const inv = await M.Invoice.findOne({ where: { id: req.params.id, patientId: req.patient.id } }); if (!inv) throw httpError(404, 'Facture introuvable');
  const [d] = await decorateInvoices([inv]); const { amount } = z.object({ amount: z.coerce.number().positive() }).parse(req.body);
  if (d.due <= 0) throw httpError(400, 'Facture déjà réglée');
  const amt = Math.min(d.due, amount);
  // Intégration réelle : créer une session sur la passerelle (CMI, Stripe…) puis enregistrer le paiement sur webhook confirmé.
  const pay = await M.Payment.create({ invoiceId: inv.id, patientId: req.patient.id, clinicId: req.patient.clinicId, date: D.today(), amount: amt, method: 'en_ligne', kind: amt < d.due ? 'acompte' : 'paiement', ref: 'Portail patient · ' + crypto.randomBytes(4).toString('hex').toUpperCase() });
  await require('./finance').allocateToPlan(inv, amt);
  await notify(req.patient.clinicId, { kind: 'pay', title: 'Paiement en ligne reçu', text: `${pname(req.patient)} — ${money(amt)} (${inv.number})`, link: '/paiements' });
  await audit(req, 'Paiement en ligne', `${inv.number} — ${money(amt)}`); res.status(201).json(pay);
}));

/* ---------- Messagerie & préférences ---------- */
router.get('/messages', ah(async (req, res) => {
  await M.Message.update({ seen: true }, { where: { patientId: req.patient.id, dir: 'out', seen: false } });
  res.json(await M.Message.findAll({ where: { patientId: req.patient.id }, order: [['at', 'ASC']] }));
}));
router.post('/messages', ah(async (req, res) => {
  const { text } = z.object({ text: z.string().trim().min(1).max(2000) }).parse(req.body);
  const m = await M.Message.create({ patientId: req.patient.id, dir: 'in', channel: 'chat', text, at: new Date(), auto: false, status: 'non_lu' });
  await notify(req.patient.clinicId, { kind: 'msg', title: 'Nouveau message patient', text: `${pname(req.patient)} : « ${text.slice(0, 60)} »`, link: '/communication/' + req.patient.id });
  res.status(201).json(m);
}));
router.patch('/preferences', ah(async (req, res) => {
  const d = z.object({ sms: z.boolean().optional(), whatsapp: z.boolean().optional(), email: z.boolean().optional(), photos: z.boolean().optional() }).parse(req.body);
  req.patient.consent = { ...req.patient.consent, ...d }; await req.patient.save();
  await audit(req, 'Préférences de communication modifiées', Object.entries(d).map(([k, v]) => `${k}:${v ? 'oui' : 'non'}`).join(', ')); res.json(req.patient.consent);
}));

module.exports = router;
