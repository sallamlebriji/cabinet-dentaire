const router = require('express').Router();
const { Op } = require('sequelize');
const { z } = require('zod');
const M = require('../models');
const { requirePerm, inScope, scopedPatient } = require('../middleware/auth');
const { audit, withPatients, decorateInvoices, createInvoice, sendMessage, fillTemplate, patientBalance, invoiceTotal } = require('../services/core');
const { ah, D, pname, money, httpError } = require('../utils/helpers');

const quoteTotal = q => { const sub = q.items.reduce((s, i) => s + i.qty * i.price, 0); const ld = q.items.reduce((s, i) => s + (i.disc || 0), 0); return Math.round((sub - ld) * (1 - (q.discount || 0) / 100)); };
const qStatus = q => (q.status === 'envoye' && q.valid < D.today() ? 'expire' : q.status);
const decorateQuote = q => { const o = q.toJSON ? q.toJSON() : q; return { ...o, total: quoteTotal(o), effectiveStatus: qStatus(o) }; };
const scopedPids = async req => (await M.Patient.findAll({ where: inScope(req), attributes: ['id'], raw: true })).map(p => p.id);
async function scopedQuote(req, id) { const q = await M.Quote.findByPk(id); if (!q) throw httpError(404, 'Devis introuvable'); await scopedPatient(req, q.patientId); return q; }

/* =================== DEVIS =================== */
router.get('/quotes', requirePerm('finance.view'), ah(async (req, res) => {
  const where = { patientId: req.query.patient ? (await scopedPatient(req, req.query.patient)).id : { [Op.in]: await scopedPids(req) } };
  res.json(await withPatients((await M.Quote.findAll({ where, order: [['date', 'DESC']] })).map(decorateQuote)));
}));
router.get('/quotes/:id', requirePerm('finance.view'), ah(async (req, res) => res.json((await withPatients([decorateQuote(await scopedQuote(req, req.params.id))]))[0])));
router.post('/quotes', requirePerm('finance.edit'), ah(async (req, res) => {
  const d = z.object({ patientId: z.string(), dentistId: z.string().optional() }).parse(req.body); const p = await scopedPatient(req, d.patientId);
  const q = await M.Quote.create({ number: await M.nextNumber('quote', `DEV-${new Date().getFullYear()}-`, 4), patientId: p.id, dentistId: d.dentistId || p.dentistId, date: D.today(), valid: D.add(D.today(), 60), status: 'brouillon', items: [{ label: 'Consultation', tooth: '', qty: 1, price: 300, disc: 0 }], discount: 0, conditions: 'Devis valable 60 jours. Acompte de 30 % à l’acceptation.' });
  await audit(req, 'Devis créé', q.number); res.status(201).json(q);
}));
router.patch('/quotes/:id', requirePerm('finance.edit'), ah(async (req, res) => {
  const q = await scopedQuote(req, req.params.id); if (q.status !== 'brouillon') throw httpError(400, 'Seuls les brouillons sont modifiables');
  const d = z.object({ patientId: z.string().optional(), dentistId: z.string().optional(), valid: z.string().optional(), discount: z.coerce.number().min(0).max(50).optional(), conditions: z.string().optional(), items: z.array(z.object({ label: z.string(), tooth: z.string().optional().default(''), qty: z.coerce.number().min(1), price: z.coerce.number().min(0), disc: z.coerce.number().min(0).default(0) })).optional() }).parse(req.body);
  if (d.patientId) await scopedPatient(req, d.patientId);
  Object.assign(q, d); await q.save(); res.json(decorateQuote(q));
}));
router.post('/quotes/:id/send', requirePerm('finance.edit'), ah(async (req, res) => {
  const q = await scopedQuote(req, req.params.id); const p = await M.Patient.findByPk(q.patientId);
  q.status = 'envoye'; q.sentAt = D.today(); await q.save();
  await sendMessage(p, `Bonjour ${p.first}, votre devis ${q.number} (${money(quoteTotal(q))}) est disponible en PDF dans votre espace patient. Vous pouvez l’accepter en ligne.`, 'email', { auto: true });
  await audit(req, 'Devis envoyé', `${pname(p)} — ${q.number}`); res.json(decorateQuote(q));
}));
router.post('/quotes/:id/:action(accept|refuse)', requirePerm('finance.edit'), ah(async (req, res) => {
  const q = await scopedQuote(req, req.params.id);
  if (req.params.action === 'accept') { q.status = 'accepte'; q.acceptedAt = D.today(); q.signature = pname(await M.Patient.findByPk(q.patientId)); } else q.status = 'refuse';
  await q.save(); await audit(req, req.params.action === 'accept' ? 'Devis accepté' : 'Devis refusé', q.number); res.json(decorateQuote(q));
}));
router.post('/quotes/:id/to-plan', requirePerm('clinical.edit', 'finance.edit'), ah(async (req, res) => {
  const q = await scopedQuote(req, req.params.id);
  const pl = await M.Plan.create({ patientId: q.patientId, dentistId: q.dentistId, title: 'Plan — ' + q.number, createdOn: D.today(), status: 'accepte' });
  await M.PlanItem.bulkCreate(q.items.map((i, k) => ({ planId: pl.id, label: i.label, tooth: i.tooth || '—', price: i.qty * i.price - (i.disc || 0), status: 'accepte', paid: 0, position: k })));
  q.planId = pl.id; await q.save(); await audit(req, 'Plan créé depuis le devis', q.number); res.status(201).json(pl);
}));
router.post('/quotes/:id/deposit', requirePerm('finance.edit'), ah(async (req, res) => {
  const q = await scopedQuote(req, req.params.id); const p = await M.Patient.findByPk(q.patientId);
  const inv = await createInvoice({ patient: p, dentistId: q.dentistId, items: [{ label: `Acompte 30 % — devis ${q.number}`, tooth: '', qty: 1, price: Math.round(quoteTotal(q) * 0.3 / 10) * 10 }], planId: q.planId, dueDays: 15 });
  await audit(req, 'Facture d’acompte créée', `${q.number} → ${inv.number}`); res.status(201).json(inv);
}));

/* =================== FACTURES =================== */
router.get('/invoices', requirePerm('finance.view'), ah(async (req, res) => {
  const { status = 'toutes', q } = req.query;
  let list = await decorateInvoices(await M.Invoice.findAll({ where: inScope(req), order: [['date', 'DESC'], ['number', 'DESC']] }));
  const all = list; const m0 = D.monthStart();
  if (status === 'impayees') list = list.filter(x => x.status !== 'payee'); else if (status === 'retard') list = list.filter(x => x.status.startsWith('retard')); else if (status === 'payees') list = list.filter(x => x.status === 'payee'); else if (status === 'partielles') list = list.filter(x => ['partielle', 'retard_partiel'].includes(x.status));
  list = await withPatients(list);
  if (q) { const s = q.toLowerCase(); list = list.filter(x => (x.number + ' ' + pname(x.patient)).toLowerCase().includes(s)); }
  const month = all.filter(x => x.date >= m0); const open = all.filter(x => x.status !== 'payee'); const late = all.filter(x => x.status.startsWith('retard'));
  const collected = parseFloat((await M.Payment.sum('amount', { where: { ...inScope(req), date: { [Op.gte]: m0 } } })) || 0);
  res.json({ rows: list.slice(0, 150), total: list.length, kpi: { billedMonth: month.reduce((s, x) => s + x.total, 0), billedMonthN: month.length, collectedMonth: collected, open: open.reduce((s, x) => s + x.due, 0), openN: open.length, late: late.reduce((s, x) => s + x.due, 0), lateN: late.length } });
}));
router.get('/invoices/:id', requirePerm('finance.view'), ah(async (req, res) => {
  const inv = await M.Invoice.findOne({ where: { id: req.params.id, ...inScope(req) } }); if (!inv) throw httpError(404, 'Facture introuvable');
  const [d] = await withPatients(await decorateInvoices([inv]));
  res.json({ ...d, payments: await M.Payment.findAll({ where: { invoiceId: inv.id }, order: [['date', 'ASC']] }), balance: await patientBalance(inv.patientId) });
}));
router.post('/invoices', requirePerm('finance.edit'), ah(async (req, res) => {
  const d = z.object({ patientId: z.string(), items: z.array(z.object({ label: z.string(), tooth: z.string().optional().default(''), qty: z.coerce.number().min(1), price: z.coerce.number().min(0) })).min(1), discount: z.coerce.number().min(0).max(100).default(0), due: z.string().optional() }).parse(req.body);
  const p = await scopedPatient(req, d.patientId);
  const inv = await createInvoice({ patient: p, items: d.items, discount: d.discount, dueDays: d.due ? Math.max(0, D.diff(D.today(), d.due)) : 30 });
  await audit(req, 'Facture créée', `${pname(p)} — ${inv.number}`); res.status(201).json(inv);
}));
router.patch('/invoices/:id', requirePerm('finance.edit'), ah(async (req, res) => {
  const inv = await M.Invoice.findOne({ where: { id: req.params.id, ...inScope(req) } }); if (!inv) throw httpError(404, 'Facture introuvable');
  const { discount } = z.object({ discount: z.coerce.number().min(0).max(100) }).parse(req.body);
  inv.discount = discount; await inv.save(); await audit(req, 'Remise appliquée', `${inv.number} — ${discount} %`); res.json(inv);
}));
router.post('/invoices/:id/remind', requirePerm('comm.send'), ah(async (req, res) => {
  const inv = await M.Invoice.findOne({ where: { id: req.params.id, ...inScope(req) } }); if (!inv) throw httpError(404, 'Facture introuvable');
  const [d] = await decorateInvoices([inv]); const p = await M.Patient.findByPk(inv.patientId); const tpl = await M.Template.findByPk('t5');
  await sendMessage(p, await fillTemplate(tpl.text, p, { montant: money(d.due) }), 'sms');
  await audit(req, 'Rappel de paiement envoyé', `${pname(p)} — ${inv.number}`); res.json({ ok: true });
}));

/* =================== PAIEMENTS =================== */
async function allocateToPlan(invoice, amount) {
  if (!invoice || !invoice.planId || amount <= 0) return;
  const items = await M.PlanItem.findAll({ where: { planId: invoice.planId }, order: [['position', 'ASC']] });
  let left = amount;
  for (const it of items) { if (left <= 0) break; const room = it.price - it.paid; if (room <= 0) continue; const x = Math.min(room, left); it.paid += x; left -= x; await it.save(); }
}
router.get('/payments', requirePerm('finance.view'), ah(async (req, res) => {
  const { method, kind, q } = req.query; const where = { ...inScope(req) };
  if (method && method !== 'all') where.method = method; if (kind && kind !== 'all') where.kind = kind;
  let rows = await withPatients(await M.Payment.findAll({ where, order: [['date', 'DESC'], ['createdAt', 'DESC']], limit: q ? 2000 : 120 }));
  if (q) rows = rows.filter(r => pname(r.patient).toLowerCase().includes(q.toLowerCase())).slice(0, 120);
  const invs = await M.Invoice.findAll({ where: { id: rows.map(r => r.invoiceId).filter(Boolean) }, attributes: ['id', 'number'], raw: true });
  const num = Object.fromEntries(invs.map(i => [i.id, i.number]));
  const t = D.today(), m0 = D.monthStart(), from = D.add(t, -13); const sc = inScope(req);
  const month = await M.Payment.findAll({ where: { ...sc, date: { [Op.gte]: m0 < from ? m0 : from } }, raw: true });
  month.forEach(p => { p.amount = parseFloat(p.amount); });
  const inMonth = month.filter(p => p.date >= m0);
  // Soldes patients (top 6)
  const pids = (await M.Patient.findAll({ where: sc, attributes: ['id'], raw: true })).map(p => p.id);
  const allInv = await M.Invoice.findAll({ where: { patientId: pids } }); const tot = {}; allInv.forEach(i => { tot[i.patientId] = (tot[i.patientId] || 0) + invoiceTotal(i); });
  const paid = Object.fromEntries((await M.Payment.findAll({ attributes: ['patientId', [M.sequelize.fn('SUM', M.sequelize.col('amount')), 's']], where: { patientId: pids }, group: ['patientId'], raw: true })).map(r => [r.patientId, parseFloat(r.s)]));
  const balances = await withPatients(Object.keys(tot).map(id => ({ patientId: id, total: tot[id], paid: paid[id] || 0, due: tot[id] - (paid[id] || 0) })).filter(b => b.due > 0).sort((a, b) => b.due - a.due).slice(0, 6));
  res.json({
    rows: rows.map(r => ({ ...r, invoiceNumber: num[r.invoiceId] || null })),
    kpi: { today: month.filter(p => p.date === t).reduce((s, p) => s + p.amount, 0), month: inMonth.reduce((s, p) => s + p.amount, 0), deposits: inMonth.filter(p => p.kind === 'acompte').reduce((s, p) => s + p.amount, 0), refunds: Math.abs(inMonth.filter(p => p.kind === 'remboursement').reduce((s, p) => s + p.amount, 0)) },
    daily: Array.from({ length: 14 }, (_, i) => { const d = D.add(from, i); const r = { date: d }; ['especes', 'carte', 'virement', 'en_ligne'].forEach(m => { r[m] = month.filter(p => p.date === d && p.method === m && p.amount > 0).reduce((s, p) => s + p.amount, 0); }); return r; }),
    byMethod: ['especes', 'carte', 'virement', 'en_ligne', 'cheque'].map(m => ({ method: m, value: inMonth.filter(p => p.method === m && p.amount > 0).reduce((s, p) => s + p.amount, 0) })).filter(x => x.value),
    balances
  });
}));
router.post('/payments', requirePerm('finance.edit'), ah(async (req, res) => {
  const d = z.object({ patientId: z.string(), invoiceId: z.string().optional().nullable(), amount: z.coerce.number().positive('Montant requis'), method: z.enum(['especes', 'carte', 'virement', 'en_ligne', 'cheque']), kind: z.enum(['paiement', 'acompte', 'remboursement']), ref: z.string().max(160).optional() }).parse(req.body);
  const p = await scopedPatient(req, d.patientId); const inv = d.invoiceId ? await M.Invoice.findOne({ where: { id: d.invoiceId, patientId: p.id } }) : null;
  const amount = d.kind === 'remboursement' ? -Math.abs(d.amount) : d.amount;
  const pay = await M.Payment.create({ ...d, invoiceId: inv ? inv.id : null, clinicId: p.clinicId, date: D.today(), amount });
  await allocateToPlan(inv, amount);
  await audit(req, `Paiement enregistré (${d.method})`, `${pname(p)} — ${money(amount)}`);
  res.status(201).json({ payment: pay, balance: await patientBalance(p.id) });
}));

module.exports = router;
module.exports.allocateToPlan = allocateToPlan;
