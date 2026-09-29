/* API publique : site vitrine & prise de rendez-vous en ligne (sans authentification) */
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { Op } = require('sequelize');
const { z } = require('zod');
const M = require('../models');
const { freeSlots, sendMessage, notify } = require('../services/core');
const { ah, D, pname, staffName, httpError } = require('../utils/helpers');

const bookLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, message: { error: 'Trop de réservations depuis cette adresse, réessayez plus tard.' } });
const readLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120 });
router.use(readLimiter);

async function settings() { const rows = await M.Setting.findAll({ where: { key: ['general', 'booking', 'types'] } }); return Object.fromEntries(rows.map(r => [r.key, r.value])); }
async function dentistsFor(clinicId, type) {
  const all = await M.User.findAll({ where: { role: 'dentiste', active: true, clinicId } });
  return all.filter(d => (type === 'orthodontie' ? /ortho/i.test(d.spec || '') : !/^Orthodontie$/i.test(d.spec || '') || type === 'consultation'));
}
async function slotsFor({ clinic, type, dentist, date }) {
  const st = await settings(); const t = st.types[type]; if (!t || !st.booking.types.includes(type)) throw httpError(400, 'Type de rendez-vous non réservable en ligne');
  if (date < D.today() || D.diff(D.today(), date) > st.booking.maxDays) return [];
  const ds = dentist && dentist !== 'any' ? [dentist] : (await dentistsFor(clinic, type)).map(d => d.id);
  const map = {};
  for (const id of ds) (await freeSlots(id, date, t.dur, { minNoticeHours: st.booking.minNotice })).forEach(s => { if (!map[s]) map[s] = id; });
  return Object.keys(map).sort().map(s => ({ time: s, dentistId: map[s] }));
}

router.get('/info', ah(async (req, res) => {
  const st = await settings();
  const clinics = await M.Clinic.findAll(); const order = ['fes', 'meknes', 'rabat']; clinics.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const dentists = await M.User.findAll({ where: { role: 'dentiste', active: true }, attributes: ['id', 'first', 'last', 'title', 'spec', 'clinicId', 'color', 'chair'] });
  res.json({ group: st.general.group, legal: st.general.legal, enabled: st.booking.enabled, maxDays: st.booking.maxDays, clinics: clinics.map(c => ({ id: c.id, name: c.name, city: c.city, address: c.address, phone: c.phone })), dentists, types: st.booking.types.map(k => ({ key: k, ...st.types[k] })) });
}));
router.get('/dentists', ah(async (req, res) => res.json(await dentistsFor(req.query.clinic, req.query.type))));
router.get('/days', ah(async (req, res) => {
  const { clinic, type, dentist } = req.query; const out = []; let d = D.today();
  while (out.length < 21) { if (D.parse(d).getDay() !== 0) out.push({ date: d, count: (await slotsFor({ clinic, type, dentist, date: d })).length }); d = D.add(d, 1); }
  res.json(out);
}));
router.get('/slots', ah(async (req, res) => res.json(await slotsFor(req.query))));

const BookIn = z.object({
  clinic: z.string(), type: z.string(), dentist: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^\d{2}:\d{2}$/), slotDentist: z.string().optional(),
  first: z.string().trim().min(1, 'Prénom requis').max(80), last: z.string().trim().min(1, 'Nom requis').max(80), phone: z.string().refine(v => v.replace(/\D/g, '').length >= 9, 'Numéro de mobile invalide'),
  email: z.string().email().optional().or(z.literal('')), dob: z.string().optional().or(z.literal('')), note: z.string().max(500).optional(), remind: z.boolean().default(true),
  consent: z.literal(true, { errorMap: () => ({ message: 'Consentement requis' }) }), website: z.string().max(0).optional() // honeypot anti-robots
});
router.post('/book', bookLimiter, ah(async (req, res) => {
  const d = BookIn.parse(req.body); const st = await settings();
  if (!st.booking.enabled) throw httpError(403, 'La réservation en ligne est désactivée');
  const dentistId = d.slotDentist || d.dentist;
  const slots = await slotsFor({ clinic: d.clinic, type: d.type, dentist: dentistId, date: d.date });
  if (!slots.some(s => s.time === d.time)) throw httpError(409, 'Ce créneau vient d’être réservé — merci d’en choisir un autre');
  const dn = await M.User.findByPk(dentistId); const t = st.types[d.type];
  const digits = d.phone.replace(/\D/g, '');
  let p = await M.Patient.findOne({ where: M.sequelize.where(M.sequelize.fn('REPLACE', M.sequelize.col('phone'), ' ', ''), digits) });
  if (!p) {
    p = await M.Patient.create({ first: d.first, last: d.last, sex: 'F', dob: d.dob || null, clinicId: d.clinic, phone: d.phone, email: d.email || '', address: '', emergency: {}, cover: 'Non renseignée', fileNo: await M.nextNumber('file', 'DOS-', 5), history: [], allergies: [], meds: [], dentistId, tags: ['Nouveau', 'Réservation en ligne'], createdOn: D.today(), avatar: '#3AA6A0', consent: { rgpd: true, sms: d.remind, email: !!d.email, whatsapp: d.remind, photos: false }, source: 'online' });
  }
  const a = await M.Appointment.create({ patientId: p.id, dentistId, clinicId: dn.clinicId, chair: dn.chair, date: d.date, start: d.time, dur: t.dur, type: d.type, status: 'confirme', note: d.note ? 'En ligne : ' + d.note : 'Réservé en ligne', source: 'online' });
  const clinic = await M.Clinic.findByPk(a.clinicId);
  const when = new Date(a.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  await sendMessage(p, `Bonjour ${p.first}, votre rendez-vous chez ${staffName(dn)} est confirmé le ${when} à ${a.start.replace(':', 'h')}. ${st.general.group} — ${clinic.city}.`, 'sms', { auto: true, force: true });
  await notify(a.clinicId, { kind: 'booking', title: 'Réservation en ligne', text: `${pname(p)} — ${t.label}, ${when} à ${a.start} avec ${staffName(dn)}.`, link: '/agenda' });
  await M.AuditLog.create({ at: new Date(), user: 'Réservation en ligne', action: 'Rendez-vous réservé en ligne', target: `${pname(p)} — ${a.date} ${a.start}`, ip: req.ip });
  res.status(201).json({ id: a.id, date: a.date, start: a.start, dur: a.dur, type: d.type, typeLabel: t.label, dentist: { name: staffName(dn), first: dn.first, last: dn.last, color: dn.color }, clinic: { name: clinic.name, address: clinic.address, city: clinic.city, phone: clinic.phone }, email: !!d.email });
}));

router.post('/demo-request', bookLimiter, ah(async (req, res) => {
  const d = z.object({ name: z.string().trim().min(2), cabinet: z.string().optional(), city: z.string().optional(), size: z.string().optional(), phone: z.string().trim().min(6), email: z.string().email().optional().or(z.literal('')), msg: z.string().max(2000).optional() }).parse(req.body);
  await M.DemoRequest.create({ data: { ...d, at: new Date().toISOString() } }); res.status(201).json({ ok: true });
}));

module.exports = router;
