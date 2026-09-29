const router = require('express').Router();
const { Op } = require('sequelize');
const M = require('../models');
const { requirePerm, inScope } = require('../middleware/auth');
const { decorateInvoices } = require('../services/core');
const { history } = require('./dashboard');
const { ah, D } = require('../utils/helpers');

router.get('/analytics', requirePerm('analytics.view'), ah(async (req, res) => {
  const range = +req.query.range === 6 ? 6 : 12;
  const t = D.today(); const from = D.add(t, -60); const sc = inScope(req);
  const hist = (await history(req.clinics)).slice(-range);
  const [types, ap, patients, plans, quotes, reviews, payments, invoices, dentists] = await Promise.all([
    M.Setting.findByPk('types'),
    M.Appointment.findAll({ where: { ...sc, date: { [Op.between]: [from, t] } }, raw: true }),
    M.Patient.findAll({ where: sc, attributes: ['id', 'dob', 'sex'], raw: true }),
    M.Plan.findAll({ include: [{ model: M.PlanItem, as: 'items' }] }),
    M.Quote.findAll({ raw: true }),
    M.Review.findAll({ where: sc, raw: true }),
    M.Payment.findAll({ where: { ...sc, date: { [Op.gte]: from }, amount: { [Op.gt]: 0 } }, raw: true }),
    M.Invoice.findAll({ where: sc }),
    M.User.findAll({ where: { role: 'dentiste', clinicId: { [Op.in]: req.clinics } } })
  ]);
  const T = types.value; const pids = new Set(patients.map(p => p.id));
  const done = ap.filter(a => a.status === 'termine');
  const count = arr => arr.reduce((m, k) => { m[k] = (m[k] || 0) + 1; return m; }, {});

  // Activité : affluence jour × heure
  const hours = [8, 9, 10, 11, 12, 14, 15, 16, 17, 18];
  const heat = [1, 2, 3, 4, 5, 6].map(d => hours.map(h => ap.filter(a => D.parse(a.date).getDay() === d && Math.floor(D.min(a.start) / 60) === h && a.status !== 'annule').length));

  // Finance
  const revByType = {}; done.forEach(a => { revByType[a.type] = (revByType[a.type] || 0) + T[a.type].price; });
  const byMethod = {}; payments.forEach(p => { byMethod[p.method] = (byMethod[p.method] || 0) + parseFloat(p.amount); });
  const dec = await decorateInvoices(invoices);
  const aging = [[0, 30], [31, 60], [61, 90], [91, 99999]].map(([a, b]) => dec.filter(i => { const d = D.diff(i.date, t); return i.due > 0 && d >= a && d <= b; }).reduce((s, i) => s + i.due, 0));

  // Patients
  const allDone = await M.Appointment.findAll({ attributes: ['patientId'], where: { ...sc, status: 'termine' }, raw: true });
  const visits = count(allDone.map(a => a.patientId)); const visits60 = count(done.map(a => a.patientId));
  const freqB = { '0': 0, '1': 0, '2–3': 0, '4–6': 0, '7+': 0 };
  patients.forEach(p => { const n = visits60[p.id] || 0; freqB[n === 0 ? '0' : n === 1 ? '1' : n <= 3 ? '2–3' : n <= 6 ? '4–6' : '7+']++; });
  const age = p => { const d = D.parse(p.dob), n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--; return a; };
  const ages = [['< 18', 0, 17], ['18–30', 18, 30], ['31–45', 31, 45], ['46–60', 46, 60], ['> 60', 61, 150]].map(([label, a, b]) => ({ label, value: patients.filter(p => { const x = age(p); return x >= a && x <= b; }).length }));
  const future = await M.Appointment.findAll({ where: { ...sc, date: { [Op.gt]: t } }, attributes: ['source'], raw: true });

  // Traitements
  const myPlans = plans.filter(p => pids.has(p.patientId)); const myQuotes = quotes.filter(q => pids.has(q.patientId));
  const ps = s => myPlans.filter(p => p.status === s).length;
  const planValue = myPlans.reduce((s, p) => s + p.items.reduce((a, i) => a + i.price, 0), 0) / (myPlans.length || 1);

  res.json({
    history: hist,
    activity: { heat, hours },
    finance: { revByType, byMethod, aging },
    patients: {
      active: patients.length, retention: Math.round(patients.filter(p => (visits[p.id] || 0) >= 2).length / (patients.length || 1) * 100),
      frequency: done.length / (Object.keys(visits60).length || 1), online: Math.round(future.filter(a => a.source === 'online').length / (future.length || 1) * 100),
      freq: freqB, ages, women: patients.filter(p => p.sex === 'F').length, men: patients.filter(p => p.sex === 'M').length
    },
    treatments: {
      byType: count(done.map(a => a.type)), plans: myPlans.length, accepted: myPlans.filter(p => p.status !== 'propose').length,
      inProgress: ps('encours') + ps('planifie'), done: ps('termine'), planValue,
      quoteConv: Math.round(myQuotes.filter(q => q.status === 'accepte').length / (myQuotes.filter(q => q.status !== 'brouillon').length || 1) * 100)
    },
    dentists: dentists.map(d => {
      const x = ap.filter(a => a.dentistId === d.id); const rv = reviews.filter(r => r.dentistId === d.id);
      return { id: d.id, name: `${d.title} ${d.first} ${d.last}`, spec: d.spec, color: d.color, first: d.first, last: d.last, done: x.filter(a => a.status === 'termine').length, revenue: x.filter(a => a.status === 'termine').reduce((s, a) => s + T[a.type].price, 0), noshow: x.filter(a => a.status === 'noshow').length / (x.length || 1) * 100, patients: new Set(x.map(a => a.patientId)).size, rating: rv.reduce((s, r) => s + r.rating, 0) / (rv.length || 1) };
    })
  });
}));

module.exports = router;
