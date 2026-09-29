/* Services transverses : audit, notifications, messagerie, facturation, créneaux, enrichissement */
const { Op, fn, col } = require('sequelize');
const M = require('../models');
const { D, uid, money, pname, staffName } = require('../utils/helpers');

/* ---------- Journal d'audit (append-only) ---------- */
async function audit(req, action, target = '') {
  const who = req.user ? staffName(req.user) : req.patient ? pname(req.patient) + ' (portail)' : 'Système';
  await M.AuditLog.create({ at: new Date(), user: who, userId: req.user ? req.user.id : req.patient ? req.patient.id : null, action, target: String(target).slice(0, 250), ip: (req.ip || '').replace('::ffff:', '') });
}

/* ---------- Notifications internes ---------- */
const notify = (clinicId, n) => M.Notification.create({ at: new Date(), read: false, clinicId, ...n });

/* ---------- Messagerie multicanale ----------
   Les passerelles réelles (SMS, WhatsApp Business, email) se branchent ici.
   En développement, les messages sont journalisés dans la console et enregistrés en base. */
const CHANNEL_CONSENT = { sms: 'sms', whatsapp: 'whatsapp', email: 'email' };
async function sendMessage(patient, text, channel = 'sms', { auto = false, force = false } = {}) {
  const key = CHANNEL_CONSENT[channel];
  if (key && !force && patient.consent && patient.consent[key] === false) return { skipped: true, reason: 'consentement' };
  const msg = await M.Message.create({ patientId: patient.id, dir: 'out', channel, text, at: new Date(), auto, status: 'envoye', seen: false });
  if (process.env.NODE_ENV !== 'test') console.log(`[${channel.toUpperCase()} → ${channel === 'email' ? patient.email : patient.phone}] ${text.slice(0, 120)}${text.length > 120 ? '…' : ''}`);
  return msg;
}
async function fillTemplate(text, patient, extra = {}) {
  const clinic = await M.Clinic.findByPk(patient.clinicId); const dn = await M.User.findByPk(patient.dentistId); const g = (await M.Setting.findByPk('general')).value;
  const map = Object.assign({ prenom: patient.first, nom: patient.last, dentiste: staffName(dn), cabinet: `${g.group} — ${clinic ? clinic.city : ''}`, telephone: clinic ? clinic.phone : '', lien: 'nacre.ma/rdv/atlas', montant: money((await patientBalance(patient.id)).due), date: '', heure: '', quand: '' }, extra);
  return text.replace(/\{(\w+)\}/g, (m, k) => (map[k] ?? m));
}

/* ---------- Facturation ---------- */
const invoiceTotal = inv => { const sub = (inv.items || []).reduce((s, x) => s + x.qty * x.price, 0); return Math.round(sub * (1 - (inv.discount || 0) / 100)); };
async function paidByInvoice(ids) {
  if (!ids.length) return {};
  const rows = await M.Payment.findAll({ attributes: ['invoiceId', [fn('SUM', col('amount')), 'paid']], where: { invoiceId: { [Op.in]: ids } }, group: ['invoiceId'], raw: true });
  return Object.fromEntries(rows.map(r => [r.invoiceId, parseFloat(r.paid)]));
}
function invoiceStatus(inv, paid) { const tot = invoiceTotal(inv); if (paid >= tot) return 'payee'; if (D.today() > inv.due) return paid > 0 ? 'retard_partiel' : 'retard'; return paid > 0 ? 'partielle' : 'impayee'; }
async function decorateInvoices(invs) {
  const paid = await paidByInvoice(invs.map(i => i.id));
  return invs.map(i => { const o = i.toJSON ? i.toJSON() : i; const p = paid[o.id] || 0; const total = invoiceTotal(o); return { ...o, total, paid: p, due: total - p, status: invoiceStatus(o, p) }; });
}
async function patientBalance(patientId) {
  const invs = await M.Invoice.findAll({ where: { patientId } });
  const total = invs.reduce((s, i) => s + invoiceTotal(i), 0);
  const paid = parseFloat((await M.Payment.sum('amount', { where: { patientId } })) || 0);
  return { total, paid, due: total - paid };
}
async function nextInvoiceNumber() { return M.nextNumber('invoice', `FAC-${new Date().getFullYear()}-`, 5); }
async function createInvoice({ patient, dentistId, items, apptId = null, planId = null, discount = 0, dueDays = 30 }) {
  return M.Invoice.create({ number: await nextInvoiceNumber(), patientId: patient.id, clinicId: patient.clinicId, dentistId: dentistId || patient.dentistId, date: D.today(), due: D.add(D.today(), dueDays), items, discount, apptId, planId });
}

/* ---------- Agenda ---------- */
async function conflict({ dentistId, date, start, dur }, ignoreId) {
  const list = await M.Appointment.findAll({ where: { dentistId, date, status: { [Op.notIn]: ['annule', 'noshow'] }, ...(ignoreId ? { id: { [Op.ne]: ignoreId } } : {}) } });
  return list.find(x => D.min(x.start) < D.min(start) + +dur && D.min(start) < D.min(x.start) + x.dur) || null;
}
async function freeSlots(dentistId, date, dur = 30, { minNoticeHours = 0, ignoreId = null } = {}) {
  const out = []; const dow = D.parse(date).getDay(); if (dow === 0) return out;
  const end = dow === 6 ? D.min('13:00') : D.min('18:30');
  const busy = await M.Appointment.findAll({ where: { dentistId, date, status: { [Op.notIn]: ['annule', 'noshow'] }, ...(ignoreId ? { id: { [Op.ne]: ignoreId } } : {}) }, attributes: ['start', 'dur'], raw: true });
  const minStart = date === D.today() ? D.nowMin() + minNoticeHours * 60 : 0;
  for (let m = D.min('08:30'); m + dur <= end; m += 30) {
    if (m < minStart) continue;
    if (m < D.min('14:00') && m + dur > D.min('12:30')) continue;
    if (!busy.some(a => D.min(a.start) < m + dur && m < D.min(a.start) + a.dur)) out.push(D.hm(m));
  }
  return out;
}

/* ---------- Enrichissement : attache un résumé patient / praticien ---------- */
async function withPatients(rows, key = 'patientId') {
  const list = rows.map(r => (r.toJSON ? r.toJSON() : r));
  const ids = [...new Set(list.map(r => r[key]).filter(Boolean))];
  const ps = ids.length ? await M.Patient.findAll({ where: { id: ids }, attributes: ['id', 'first', 'last', 'avatar', 'phone', 'allergies', 'clinicId', 'fileNo', 'noShows', 'dob', 'consent', 'dentistId'] }) : [];
  const map = Object.fromEntries(ps.map(p => [p.id, p.toJSON()]));
  return list.map(r => ({ ...r, patient: map[r[key]] || null }));
}
async function nextAppointment(patientId) {
  const t = D.today(), now = D.hm(D.nowMin());
  return M.Appointment.findOne({ where: { patientId, status: { [Op.in]: ['confirme', 'attente'] }, [Op.or]: [{ date: { [Op.gt]: t } }, { date: t, start: { [Op.gte]: now } }] }, order: [['date', 'ASC'], ['start', 'ASC']] });
}

module.exports = { audit, notify, sendMessage, fillTemplate, invoiceTotal, invoiceStatus, paidByInvoice, decorateInvoices, patientBalance, createInvoice, nextInvoiceNumber, conflict, freeSlots, withPatients, nextAppointment, uid };
