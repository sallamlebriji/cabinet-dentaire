const router = require('express').Router();
const { Op, col } = require('sequelize');
const { z } = require('zod');
const M = require('../models');
const { requirePerm, inScope, scopedPatient } = require('../middleware/auth');
const { audit, withPatients, notify, sendMessage } = require('../services/core');
const { ah, D, pname, httpError } = require('../utils/helpers');

/* =================== LABORATOIRE =================== */
const LAB_ST = ['a_envoyer', 'envoye', 'fabrication', 'pret', 'recu', 'livre'];
const LAB_LABEL = { a_envoyer: 'À envoyer', envoye: 'Envoyé', fabrication: 'En fabrication', pret: 'Prêt', recu: 'Reçu', livre: 'Livré au patient' };
router.get('/labs', requirePerm('lab.manage'), ah(async (req, res) => {
  const labs = await M.Lab.findAll(); const cases = await M.LabCase.findAll({ raw: true });
  res.json(labs.map(l => { const c = cases.filter(x => x.labId === l.id); const recv = c.filter(x => x.received); return { ...l.toJSON(), total: c.length, active: c.filter(x => !['livre', 'recu'].includes(x.status)).length, onTime: recv.length ? Math.round(recv.filter(x => x.received <= x.due).length / recv.length * 100) : null }; }));
}));
router.get('/lab-cases', requirePerm('lab.manage', 'clinical.view'), ah(async (req, res) => {
  const where = { ...inScope(req) }; if (req.query.patient) where.patientId = req.query.patient;
  res.json(await withPatients(await M.LabCase.findAll({ where, order: [['due', 'ASC']] })));
}));
router.post('/lab-cases', requirePerm('lab.manage'), ah(async (req, res) => {
  const d = z.object({ patientId: z.string(), labId: z.string(), type: z.string(), teeth: z.string().optional(), shade: z.string().optional(), due: z.string(), price: z.coerce.number().min(0), notes: z.string().optional(), send: z.boolean().optional() }).parse(req.body);
  const p = await scopedPatient(req, d.patientId);
  const l = await M.LabCase.create({ ...d, teeth: d.teeth || '—', shade: d.shade || '—', sent: d.send ? D.today() : null, status: d.send ? 'envoye' : 'a_envoyer', dentistId: p.dentistId, clinicId: p.clinicId });
  await audit(req, 'Travail laboratoire créé', `${d.type} — ${pname(p)}`); res.status(201).json(l);
}));
router.patch('/lab-cases/:id', requirePerm('lab.manage'), ah(async (req, res) => {
  const l = await M.LabCase.findOne({ where: { id: req.params.id, ...inScope(req) } }); if (!l) throw httpError(404, 'Travail introuvable');
  const d = z.object({ status: z.enum(LAB_ST).optional(), notes: z.string().optional() }).parse(req.body);
  const p = await M.Patient.findByPk(l.patientId);
  if (d.notes !== undefined) l.notes = d.notes;
  if (d.status && d.status !== l.status) {
    l.status = d.status; const t = D.today();
    if (d.status === 'envoye' && !l.sent) l.sent = t;
    if (d.status === 'recu') l.received = t;
    if (d.status === 'pret') { const lab = await M.Lab.findByPk(l.labId); await notify(l.clinicId, { kind: 'lab', title: 'Laboratoire : travail prêt', text: `${lab.name} signale : ${l.type} (${l.teeth}) de ${pname(p)} est prêt.`, link: '/laboratoire' }); }
    if (d.status === 'livre') await sendMessage(p, `Bonjour ${p.first}, votre ${l.type.toLowerCase()} a été posé(e). N’hésitez pas à nous contacter en cas de gêne.`, 'sms', { auto: true });
    await audit(req, 'Laboratoire → ' + LAB_LABEL[d.status], `${l.type} — ${pname(p)}`);
  }
  await l.save(); res.json(l);
}));

/* =================== STOCK =================== */
router.get('/products', requirePerm('stock.manage'), ah(async (req, res) => {
  const rows = await M.Product.findAll({ where: inScope(req), order: [['cat', 'ASC'], ['name', 'ASC']] });
  const sup = Object.fromEntries((await M.Supplier.findAll({ attributes: ['id', 'name'], raw: true })).map(s => [s.id, s.name]));
  res.json(rows.map(r => ({ ...r.toJSON(), supplierName: sup[r.supplierId] || '—' })));
}));
router.post('/products', requirePerm('stock.manage'), ah(async (req, res) => {
  const d = z.object({ name: z.string().min(1, 'Désignation requise'), cat: z.string(), supplierId: z.string(), qty: z.coerce.number().int().min(0), min: z.coerce.number().int().min(0), unit: z.string(), price: z.coerce.number().min(0), lot: z.string().optional(), exp: z.string().optional(), clinicId: z.string().optional() }).parse(req.body);
  const clinicId = d.clinicId && req.clinics.includes(d.clinicId) ? d.clinicId : req.clinics[0];
  const p = await M.Product.create({ ...d, clinicId }); await audit(req, 'Produit ajouté', d.name); res.status(201).json(p);
}));
router.post('/products/:id/adjust', requirePerm('stock.manage'), ah(async (req, res) => {
  const p = await M.Product.findOne({ where: { id: req.params.id, ...inScope(req) } }); if (!p) throw httpError(404, 'Produit introuvable');
  const { delta } = z.object({ delta: z.coerce.number().int() }).parse(req.body);
  p.qty = Math.max(0, p.qty + delta); await p.save();
  if (delta < 0 && p.qty <= p.min) await notify(p.clinicId, { kind: 'stock', title: 'Stock faible', text: `${p.name} : ${p.qty} restant(s) (seuil ${p.min})`, link: '/stock' });
  await audit(req, delta > 0 ? 'Entrée de stock' : 'Sortie de stock', `${p.name} → ${p.qty}`); res.json(p);
}));
router.post('/products/auto-order', requirePerm('stock.manage'), ah(async (req, res) => {
  const low = await M.Product.findAll({ where: { ...inScope(req), qty: { [Op.lte]: col('min') } } });
  if (!low.length) throw httpError(400, 'Aucun produit sous le seuil');
  const groups = {}; low.forEach(p => { const k = p.supplierId + '|' + p.clinicId; (groups[k] = groups[k] || []).push(p); });
  const orders = [];
  for (const [k, items] of Object.entries(groups)) { const [supplierId, clinicId] = k.split('|'); orders.push(await M.PurchaseOrder.create({ number: await M.nextNumber('order', 'CMD-', 4), supplierId, clinicId, date: D.today(), status: 'brouillon', lines: items.map(p => ({ product: p.id, qty: Math.max(p.min * 2 - p.qty, 1), price: p.price })) })); }
  await audit(req, 'Commandes générées automatiquement', `${low.length} produits`); res.status(201).json(orders);
}));

/* =================== FOURNISSEURS & COMMANDES =================== */
const orderTotal = o => o.lines.reduce((s, l) => s + l.qty * l.price, 0);
router.get('/suppliers', requirePerm('stock.manage'), ah(async (req, res) => {
  const [sups, orders, prods] = await Promise.all([M.Supplier.findAll(), M.PurchaseOrder.findAll({ where: inScope(req) }), M.Product.findAll({ where: inScope(req), attributes: ['supplierId'], raw: true })]);
  res.json(sups.map(s => { const os = orders.filter(o => o.supplierId === s.id); return { ...s.toJSON(), products: prods.filter(p => p.supplierId === s.id).length, orders: os.length, spent: os.filter(o => o.status === 'recue').reduce((a, o) => a + orderTotal(o), 0) }; }));
}));
router.get('/orders', requirePerm('stock.manage'), ah(async (req, res) => {
  const orders = await M.PurchaseOrder.findAll({ where: inScope(req), order: [['date', 'DESC']] });
  const prods = Object.fromEntries((await M.Product.findAll({ where: { id: orders.flatMap(o => o.lines.map(l => l.product)) } })).map(p => [p.id, p]));
  res.json(orders.map(o => ({ ...o.toJSON(), total: orderTotal(o), lines: o.lines.map(l => ({ ...l, name: prods[l.product] ? prods[l.product].name : '—', stock: prods[l.product] ? prods[l.product].qty : null })) })));
}));
router.post('/orders', requirePerm('stock.manage'), ah(async (req, res) => {
  const d = z.object({ supplierId: z.string(), lines: z.array(z.object({ product: z.string(), qty: z.coerce.number().int().min(1) })).min(1, 'Ajoutez au moins une ligne') }).parse(req.body);
  const prods = await M.Product.findAll({ where: { id: d.lines.map(l => l.product), ...inScope(req) } });
  if (prods.length !== d.lines.length) throw httpError(400, 'Produit invalide');
  const o = await M.PurchaseOrder.create({ number: await M.nextNumber('order', 'CMD-', 4), supplierId: d.supplierId, clinicId: prods[0].clinicId, date: D.today(), status: 'brouillon', lines: d.lines.map(l => ({ ...l, price: prods.find(p => p.id === l.product).price })) });
  res.status(201).json(o);
}));
router.patch('/orders/:id', requirePerm('stock.manage'), ah(async (req, res) => {
  const o = await M.PurchaseOrder.findOne({ where: { id: req.params.id, ...inScope(req) } }); if (!o) throw httpError(404, 'Commande introuvable');
  if (o.status !== 'brouillon') throw httpError(400, 'Seuls les brouillons sont modifiables');
  const { lines } = z.object({ lines: z.array(z.object({ product: z.string(), qty: z.coerce.number().int().min(0), price: z.coerce.number() })) }).parse(req.body);
  o.lines = lines.filter(l => l.qty > 0); await o.save(); res.json(o);
}));
router.post('/orders/:id/place', requirePerm('stock.manage'), ah(async (req, res) => {
  const o = await M.PurchaseOrder.findOne({ where: { id: req.params.id, ...inScope(req) } }); if (!o || o.status !== 'brouillon') throw httpError(400, 'Commande non modifiable');
  const s = await M.Supplier.findByPk(o.supplierId);
  o.status = 'commandee'; o.date = D.today(); o.expected = D.add(D.today(), s.delay); await o.save();
  await audit(req, 'Commande fournisseur passée', `${o.number} — ${s.name}`); res.json(o);
}));
router.post('/orders/:id/receive', requirePerm('stock.manage'), ah(async (req, res) => {
  const o = await M.PurchaseOrder.findOne({ where: { id: req.params.id, ...inScope(req) } }); if (!o || o.status !== 'commandee') throw httpError(400, 'Commande non réceptionnable');
  await M.sequelize.transaction(async t => {
    for (const l of o.lines) await M.Product.increment({ qty: l.qty }, { where: { id: l.product }, transaction: t });
    o.status = 'recue'; o.received = D.today(); await o.save({ transaction: t });
  });
  await audit(req, 'Réception commande — stock mis à jour', o.number); res.json(o);
}));
router.delete('/orders/:id', requirePerm('stock.manage'), ah(async (req, res) => {
  const o = await M.PurchaseOrder.findOne({ where: { id: req.params.id, ...inScope(req), status: 'brouillon' } }); if (!o) throw httpError(400, 'Seuls les brouillons peuvent être supprimés');
  await o.destroy(); res.json({ ok: true });
}));

module.exports = router;
