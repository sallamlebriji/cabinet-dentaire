const router = require('express').Router();
const { Op, fn, col } = require('sequelize');
const M = require('../models');
const { inScope } = require('../middleware/auth');
const { decorateInvoices, withPatients } = require('../services/core');
const { ah, D, money, pname } = require('../utils/helpers');

async function history(clinics) {
  const rows = await M.MonthlyStat.findAll({ where: { clinicId: { [Op.in]: clinics } }, order: [['month', 'ASC']] });
  const by = {};
  rows.forEach(r => { const k = r.month; const b = by[k] = by[k] || { m: k, revenue: 0, consults: 0, newPatients: 0, noshow: 0, fill: 0, recurrent: 0, n: 0 }; b.revenue += r.revenue; b.consults += r.consults; b.newPatients += r.newPatients; b.noshow += r.noshow; b.fill += r.fill; b.recurrent += r.recurrent; b.n++; });
  return Object.values(by).map(b => ({ ...b, noshow: +(b.noshow / b.n).toFixed(1), fill: Math.round(b.fill / b.n) }));
}
router.history = history;

router.get('/dashboard', ah(async (req, res) => {
  const t = D.today(), m0 = D.monthStart(); const sc = inScope(req);
  const dentist = req.query.dentist && req.query.dentist !== 'all' ? { dentistId: req.query.dentist } : {};
  const today = await withPatients(await M.Appointment.findAll({ where: { ...sc, ...dentist, date: t }, order: [['start', 'ASC']] }));
  const pids = (await M.Patient.findAll({ where: sc, attributes: ['id'], raw: true })).map(p => p.id);
  const invs = await decorateInvoices(await M.Invoice.findAll({ where: sc }));
  const unpaid = invs.filter(i => i.status !== 'payee');
  const sumPay = async where => parseFloat((await M.Payment.sum('amount', { where: { ...sc, ...where } })) || 0);

  const stats = {
    todayActive: today.filter(a => a.status !== 'annule').length,
    todayDone: today.filter(a => a.status === 'termine').length,
    todayWaiting: today.filter(a => a.status === 'attente').length,
    inChair: today.filter(a => a.status === 'encours').length,
    patientsToday: new Set(today.filter(a => !['annule', 'noshow'].includes(a.status)).map(a => a.patientId)).size,
    newPatients: await M.Patient.count({ where: { ...sc, createdOn: { [Op.gte]: m0 } } }),
    plansActive: await M.Plan.count({ where: { patientId: { [Op.in]: pids }, status: { [Op.in]: ['encours', 'planifie', 'accepte'] } } }),
    upcoming: await M.Appointment.count({ where: { ...sc, date: { [Op.gt]: t, [Op.lte]: D.add(t, 7) }, status: { [Op.in]: ['confirme', 'attente'] } } }),
    payToday: await sumPay({ date: t }),
    unpaidN: unpaid.length, unpaidAmt: unpaid.reduce((s, i) => s + i.due, 0),
    revenueMonth: await sumPay({ date: { [Op.between]: [m0, t] } })
  };

  // Alertes
  const alerts = [];
  const toConfirm = await M.Appointment.count({ where: { ...sc, status: 'attente', date: { [Op.between]: [t, D.add(t, 2)] } } });
  if (toConfirm) alerts.push({ icon: 'calendar', tone: 'tone-amber', title: `${toConfirm} rendez-vous à confirmer`, sub: 'Aujourd’hui et les 2 prochains jours', href: '/agenda' });
  const late = invs.filter(i => i.status.startsWith('retard'));
  if (late.length) alerts.push({ icon: 'card', tone: 'tone-red', title: `${late.length} paiements en retard`, sub: money(late.reduce((s, i) => s + i.due, 0)) + ' à recouvrer', href: '/facturation?statut=retard' });
  const fu = await withPatients(await M.Followup.findAll({ where: { patientId: { [Op.in]: pids }, status: { [Op.ne]: 'fait' }, due: { [Op.lte]: t } } }));
  if (fu.length) alerts.push({ icon: 'repeat', tone: 'tone-violet', title: `${fu.length} traitements / suivis à relancer`, sub: fu.slice(0, 2).map(f => pname(f.patient)).join(', ') + (fu.length > 2 ? '…' : ''), href: '/suivis' });
  const recv = await withPatients(await M.LabCase.findAll({ where: { ...sc, status: 'recu' } }));
  const portalDocs = await M.Document.count({ where: { patientId: { [Op.in]: pids }, fromPortal: true, reviewed: false } });
  if (recv.length || portalDocs) alerts.push({ icon: 'file', tone: 'tone-blue', title: `${recv.length + portalDocs} résultat(s) / document(s) à consulter`, sub: recv.map(l => `${l.type} ${pname(l.patient)}`).slice(0, 2).join(' · ') || 'Envoyés via le portail patient', href: recv.length ? '/laboratoire' : '/radiographies' });
  const low = await M.Product.findAll({ where: { ...sc, qty: { [Op.lte]: col('min') } }, attributes: ['name'] });
  if (low.length) alerts.push({ icon: 'box', tone: 'tone-red', title: `${low.length} produits en stock faible`, sub: low.slice(0, 2).map(s => s.name).join(', ') + '…', href: '/stock' });
  const exp = await M.Product.count({ where: { ...sc, exp: { [Op.lte]: D.add(t, 60) } } });
  if (exp) alerts.push({ icon: 'clock', tone: 'tone-amber', title: `${exp} produits bientôt expirés`, sub: 'Dans les 60 prochains jours', href: '/stock' });
  const lab = await withPatients(await M.LabCase.findAll({ where: { ...sc, status: { [Op.in]: ['envoye', 'fabrication', 'pret'] }, due: { [Op.lte]: D.add(t, 2) } } }));
  if (lab.length) alerts.push({ icon: 'flask', tone: 'tone-gold', title: `${lab.length} prothèse(s) en attente du laboratoire`, sub: lab.slice(0, 2).map(l => `${l.type} — ${pname(l.patient)}`).join(' · '), href: '/laboratoire' });
  const unread = await withPatients(await M.Message.findAll({ where: { patientId: { [Op.in]: pids }, dir: 'in', status: 'non_lu' }, order: [['at', 'DESC']] }));
  if (unread.length) alerts.push({ icon: 'message', tone: 'tone-teal', title: `${unread.length} message(s) patient non lu(s)`, sub: `${pname(unread[0].patient)} : « ${unread[0].text.slice(0, 40)}… »`, href: '/communication' });

  const labList = await withPatients(await M.LabCase.findAll({ where: { ...sc, status: { [Op.ne]: 'livre' } }, order: [['due', 'ASC']], limit: 4 }));
  const mix = await M.Appointment.findAll({ attributes: ['type', [fn('COUNT', col('id')), 'n']], where: { ...sc, date: { [Op.between]: [m0, D.add(m0, 40)] }, status: { [Op.ne]: 'annule' } }, group: ['type'], raw: true });

  let sites = null;
  if (req.clinics.length > 1) {
    const clinics = await M.Clinic.findAll({ where: { id: req.clinics } });
    sites = [];
    for (const c of clinics) {
      const h = (await history([c.id])).pop();
      const rv = await M.Review.findAll({ where: { clinicId: c.id }, attributes: ['rating'], raw: true });
      const ci = invs.filter(i => i.clinicId === c.id);
      sites.push({ id: c.id, name: c.name, chairs: c.chairs.length, dentists: await M.User.count({ where: { clinicId: c.id, role: 'dentiste' } }), today: await M.Appointment.count({ where: { clinicId: c.id, date: t, status: { [Op.ne]: 'annule' } } }), revenue: h ? h.revenue : 0, fill: h ? h.fill : 0, noshow: h ? h.noshow : 0, rating: rv.reduce((s, r) => s + r.rating, 0) / (rv.length || 1), unpaid: ci.reduce((s, i) => s + Math.max(0, i.due), 0) });
    }
  }
  res.json({ stats, today, alerts, lab: labList, mix, history: await history(req.clinics), sites });
}));

module.exports = router;
