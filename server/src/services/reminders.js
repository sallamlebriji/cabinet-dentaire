/* Rappels automatiques : exécutés toutes les 5 minutes selon les règles actives (table reminder_rules).
   Idempotence garantie par l'index unique (appt_id, rule_id) de reminder_logs. */
const cron = require('node-cron');
const { Op } = require('sequelize');
const M = require('../models');
const { sendMessage, fillTemplate } = require('./core');
const { D, staffName } = require('../utils/helpers');

const startAt = a => new Date(`${a.date}T${a.start}:00`);
const quand = date => { const n = D.diff(D.today(), date); return n === 0 ? 'aujourd’hui' : n === 1 ? 'demain' : 'le ' + new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); };
function pickChannel(rule, p) {
  const c = rule.channels || {};
  if (c.whatsapp && p.consent.whatsapp) return 'whatsapp';
  if (c.sms && p.consent.sms !== false) return 'sms';
  if (c.email && p.email && p.consent.email !== false) return 'email';
  if (c.push) return 'notif';
  return null;
}

async function processRule(rule) {
  const now = new Date(); let sent = 0;
  let appts = [];
  if (rule.kind === 'before' || rule.kind === 'reinforced') {
    const horizon = new Date(now.getTime() + Math.abs(rule.offsetMinutes) * 60000);
    appts = await M.Appointment.findAll({ where: { status: { [Op.in]: ['confirme', 'attente'] }, date: { [Op.between]: [D.today(), D.ymd(horizon)] } } });
    appts = appts.filter(a => { const s = startAt(a); return s > now && s <= horizon; });
  } else if (rule.kind === 'after') {
    appts = (await M.Appointment.findAll({ where: { status: 'termine', date: D.today() } })).filter(a => now - startAt(a) >= (a.dur + rule.offsetMinutes) * 60000);
  } else return 0;
  if (!appts.length) return 0;
  const done = new Set((await M.ReminderLog.findAll({ where: { ruleId: rule.id, apptId: appts.map(a => a.id) }, raw: true })).map(l => l.apptId));
  const tpl = await M.Template.findByPk(rule.templateId);
  for (const a of appts) {
    if (done.has(a.id)) continue;
    const p = await M.Patient.findByPk(a.patientId); if (!p) continue;
    if (rule.kind === 'reinforced' && !(p.reinforced || p.noShows >= 2)) continue;
    const ch = pickChannel(rule, p);
    try { await M.ReminderLog.create({ apptId: a.id, ruleId: rule.id }); } catch { continue; } // déjà traité par une autre instance
    if (!ch) continue;
    const dn = await M.User.findByPk(a.dentistId);
    const text = await fillTemplate(tpl.text, p, { dentiste: staffName(dn), quand: quand(a.date), heure: a.start.replace(':', 'h'), date: a.date });
    const r = await sendMessage(p, text, ch, { auto: true }); if (!r.skipped) sent++;
  }
  if (sent) { rule.sent += sent; await rule.save(); }
  return sent;
}

async function tick() {
  try {
    const rules = await M.ReminderRule.findAll({ where: { on: true, kind: { [Op.in]: ['before', 'after', 'reinforced'] } } });
    let total = 0; for (const r of rules) total += await processRule(r);
    if (total) console.log(`[rappels] ${total} message(s) automatique(s) envoyé(s)`);
  } catch (e) { console.error('[rappels] échec :', e.message); }
}

function startScheduler() {
  cron.schedule('*/5 * * * *', tick);
  setTimeout(tick, 5000);
  console.log('✓ Planificateur de rappels actif (toutes les 5 min)');
}

module.exports = { startScheduler, tick };
