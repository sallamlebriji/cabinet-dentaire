const router = require('express').Router();
const { Op } = require('sequelize');
const { z } = require('zod');
const M = require('../models');
const { requirePerm, inScope, scopedPatient } = require('../middleware/auth');
const { audit, withPatients, createInvoice } = require('../services/core');
const { ah, D, pname, staffName, httpError } = require('../utils/helpers');

const scopedPids = async req => (await M.Patient.findAll({ where: inScope(req), attributes: ['id'], raw: true })).map(p => p.id);

/* =================== CONSULTATIONS =================== */
router.get('/consultations', requirePerm('clinical.view'), ah(async (req, res) => {
  const { patient, type, q, page = 1 } = req.query;
  const where = patient ? { patientId: (await scopedPatient(req, patient)).id } : { patientId: { [Op.in]: await scopedPids(req) } };
  if (type && type !== 'all') where.type = type;
  if (q) where[Op.or] = ['motif', 'diagnosis', 'done'].map(f => ({ [f]: { [Op.like]: `%${q}%` } }));
  const { rows, count } = await M.Consultation.findAndCountAll({ where, order: [['date', 'DESC']], limit: patient ? 500 : 30 * +page });
  const t = D.today();
  const stats = patient ? null : {
    today: await M.Consultation.count({ where: { ...where, date: t } }), week: await M.Consultation.count({ where: { ...where, date: { [Op.gt]: D.add(t, -7) } } }),
    month: await M.Consultation.count({ where: { ...where, date: { [Op.gte]: D.monthStart() } } }), patients: (await M.Consultation.count({ where, distinct: true, col: 'patient_id' }))
  };
  res.json({ rows: await withPatients(rows), total: count, stats });
}));
const ConsultIn = z.object({ patientId: z.string(), date: z.string(), type: z.string().default('consultation'), motif: z.string().trim().min(1, 'requis'), anamnese: z.string().optional(), history: z.string().optional(), allergies: z.string().optional(), observations: z.string().optional(), diagnosis: z.string().optional(), proposed: z.string().optional(), done: z.string().optional(), notes: z.string().optional() });
router.post('/consultations', requirePerm('clinical.edit'), ah(async (req, res) => {
  const d = ConsultIn.parse(req.body); const p = await scopedPatient(req, d.patientId);
  const c = await M.Consultation.create({ ...d, dentistId: req.user.role === 'dentiste' ? req.user.id : p.dentistId });
  await audit(req, 'Consultation enregistrée', `${pname(p)} — ${d.motif}`); res.status(201).json(c);
}));

/* =================== ODONTOGRAMME =================== */
const COND_ACT = { carie: 'Traitement carie (composite)', obturation: 'Traitement carie (composite)', couronne: 'Couronne zircone', implant: 'Implant (pose)', extraction: 'Extraction simple', endo: 'Traitement endodontique', gingival: 'Surfaçage radiculaire (quadrant)', prothese: 'Couronne céramo-métallique' };
const COND_LABEL = { carie: 'Carie', obturation: 'Obturation', couronne: 'Couronne', implant: 'Implant', extraction: 'Extraction', absente: 'Dent absente', endo: 'Traitement endodontique', gingival: 'Problème gingival', prothese: 'Prothèse', autre: 'Autre observation' };
const LAYER = { initial: 'Situation initiale', planned: 'Traitement prévu', done: 'Traitement réalisé' };
async function chart(pid) { const [c] = await M.OdontoChart.findOrCreate({ where: { patientId: pid }, defaults: { teeth: {} } }); return c; }
async function odontoPayload(pid) { const c = await chart(pid); return { teeth: c.teeth, history: await M.OdontoHistory.findAll({ where: { patientId: pid }, order: [['id', 'DESC']], limit: 40 }) }; }
const hist = (req, pid, tooth, layer, cond, action) => M.OdontoHistory.create({ patientId: pid, date: D.today(), user: staffName(req.user), tooth, layer, cond, action });

router.get('/odontogram/:pid', requirePerm('clinical.view'), ah(async (req, res) => { await scopedPatient(req, req.params.pid); res.json(await odontoPayload(req.params.pid)); }));
router.post('/odontogram/:pid/marks', requirePerm('clinical.edit'), ah(async (req, res) => {
  const p = await scopedPatient(req, req.params.pid);
  const d = z.object({ tooth: z.string().regex(/^[1-4][1-8]$/), layer: z.enum(['initial', 'planned', 'done']), cond: z.enum(Object.keys(COND_LABEL)), surfaces: z.array(z.enum(['O', 'M', 'D', 'V', 'L'])).optional(), note: z.string().max(200).optional() }).parse(req.body);
  if (['carie', 'obturation'].includes(d.cond) && !(d.surfaces || []).length) throw httpError(400, 'Sélectionnez au moins une face');
  const c = await chart(p.id); const teeth = c.teeth; teeth[d.tooth] = teeth[d.tooth] || {}; const arr = teeth[d.tooth][d.layer] = teeth[d.tooth][d.layer] || [];
  const m = { c: d.cond }; if (d.surfaces && d.surfaces.length) m.s = d.surfaces; if (d.note) m.note = d.note;
  const ex = arr.findIndex(x => x.c === d.cond); if (ex >= 0) arr[ex] = m; else arr.push(m);
  c.teeth = teeth; await c.save(); await hist(req, p.id, d.tooth, d.layer, d.cond, 'ajout');
  await audit(req, 'Odontogramme modifié', `${pname(p)} — dent ${d.tooth} : ${COND_LABEL[d.cond]} (${LAYER[d.layer]})`);
  res.json(await odontoPayload(p.id));
}));
router.post('/odontogram/:pid/remove', requirePerm('clinical.edit'), ah(async (req, res) => {
  const p = await scopedPatient(req, req.params.pid); const { tooth, layer, index } = req.body;
  const c = await chart(p.id); const teeth = c.teeth; const arr = teeth[tooth] && teeth[tooth][layer]; if (!arr || !arr[index]) throw httpError(404, 'Élément introuvable');
  const [m] = arr.splice(index, 1); c.teeth = teeth; await c.save(); await hist(req, p.id, tooth, layer, m.c, 'retrait');
  await audit(req, 'Odontogramme modifié', `${pname(p)} — dent ${tooth} : retrait ${COND_LABEL[m.c]}`); res.json(await odontoPayload(p.id));
}));
router.post('/odontogram/:pid/complete', requirePerm('clinical.edit'), ah(async (req, res) => {
  const p = await scopedPatient(req, req.params.pid); const { tooth, index } = req.body;
  const c = await chart(p.id); const teeth = c.teeth; const t = teeth[tooth]; if (!t || !t.planned || !t.planned[index]) throw httpError(404, 'Élément introuvable');
  const [m] = t.planned.splice(index, 1); t.done = t.done || []; t.done.push(m); c.teeth = teeth; await c.save(); await hist(req, p.id, tooth, 'done', m.c, 'realise');
  await audit(req, 'Traitement réalisé (odontogramme)', `${pname(p)} — dent ${tooth} : ${COND_LABEL[m.c]}`); res.json(await odontoPayload(p.id));
}));
router.post('/odontogram/:pid/to-plan', requirePerm('clinical.edit'), ah(async (req, res) => {
  const p = await scopedPatient(req, req.params.pid); const { tooth, cond } = req.body;
  const label = COND_ACT[cond]; if (!label) throw httpError(400, 'Aucun acte associé');
  const act = await M.Act.findOne({ where: { label } });
  let plan = await M.Plan.findOne({ where: { patientId: p.id, status: { [Op.ne]: 'termine' } }, order: [['createdAt', 'DESC']] });
  if (!plan) plan = await M.Plan.create({ patientId: p.id, dentistId: p.dentistId, title: 'Plan de traitement', createdOn: D.today(), status: 'propose' });
  const n = await M.PlanItem.count({ where: { planId: plan.id } });
  await M.PlanItem.create({ planId: plan.id, label, tooth, price: act ? act.price : 0, status: 'propose', paid: 0, position: n });
  await audit(req, 'Acte ajouté au plan', `${pname(p)} — ${label} (${tooth})`); res.json({ planId: plan.id, label });
}));

/* =================== PLANS DE TRAITEMENT =================== */
const ORDER = ['propose', 'accepte', 'planifie', 'encours', 'termine'];
const itemsOrder = [[{ model: M.PlanItem, as: 'items' }, 'position', 'ASC']];
async function scopedPlan(req, id) { const pl = await M.Plan.findByPk(id, { include: [{ model: M.PlanItem, as: 'items' }], order: itemsOrder }); if (!pl) throw httpError(404, 'Plan introuvable'); await scopedPatient(req, pl.patientId); return pl; }
async function autoStatus(planId) {
  const pl = await M.Plan.findByPk(planId, { include: [{ model: M.PlanItem, as: 'items' }] });
  if (pl.items.length && pl.items.every(i => i.status === 'termine')) pl.status = 'termine';
  else if (pl.items.some(i => ['encours', 'termine'].includes(i.status)) && ORDER.indexOf(pl.status) < 3) pl.status = 'encours';
  await pl.save();
}
router.get('/plans', requirePerm('patients.view'), ah(async (req, res) => {
  const where = { patientId: req.query.patient ? (await scopedPatient(req, req.query.patient)).id : { [Op.in]: await scopedPids(req) } };
  res.json(await withPatients(await M.Plan.findAll({ where, include: [{ model: M.PlanItem, as: 'items' }], order: [['createdOn', 'DESC'], ...itemsOrder] })));
}));
router.get('/plans/:id', requirePerm('patients.view'), ah(async (req, res) => res.json((await withPatients([await scopedPlan(req, req.params.id)]))[0])));
router.post('/plans', requirePerm('clinical.edit'), ah(async (req, res) => {
  const d = z.object({ patientId: z.string(), title: z.string().default('Plan de traitement'), dentistId: z.string().optional() }).parse(req.body);
  const p = await scopedPatient(req, d.patientId);
  const pl = await M.Plan.create({ patientId: p.id, dentistId: d.dentistId || p.dentistId, title: d.title || 'Plan de traitement', createdOn: D.today(), status: 'propose' });
  await audit(req, 'Plan de traitement créé', pname(p)); res.status(201).json(pl);
}));
router.patch('/plans/:id', requirePerm('clinical.edit'), ah(async (req, res) => {
  const pl = await scopedPlan(req, req.params.id); const d = z.object({ status: z.enum(ORDER).optional(), title: z.string().optional() }).parse(req.body);
  Object.assign(pl, d); await pl.save(); await audit(req, 'Plan de traitement modifié', `${pl.title}${d.status ? ' → ' + d.status : ''}`); res.json(pl);
}));
router.post('/plans/:id/items', requirePerm('clinical.edit'), ah(async (req, res) => {
  const pl = await scopedPlan(req, req.params.id); const d = z.object({ label: z.string(), tooth: z.string().optional(), price: z.coerce.number().min(0) }).parse(req.body);
  const it = await M.PlanItem.create({ planId: pl.id, label: d.label, tooth: d.tooth || '—', price: d.price, status: 'propose', paid: 0, position: pl.items.length });
  res.status(201).json(it);
}));
router.patch('/plan-items/:id', requirePerm('clinical.edit'), ah(async (req, res) => {
  const it = await M.PlanItem.findByPk(req.params.id); if (!it) throw httpError(404, 'Acte introuvable'); const pl = await scopedPlan(req, it.planId);
  const d = z.object({ status: z.enum(ORDER).optional(), planned: z.string().nullable().optional(), price: z.coerce.number().optional() }).parse(req.body);
  if (d.status) { it.status = d.status; it.done = d.status === 'termine' ? (it.done || D.today()) : null; }
  if (d.planned !== undefined) { it.planned = d.planned || null; if (['propose', 'accepte'].includes(it.status) && d.planned) it.status = 'planifie'; }
  if (d.price !== undefined) it.price = d.price;
  await it.save(); await autoStatus(pl.id); await audit(req, 'Acte du plan modifié', `${it.label} (${it.tooth})`); res.json(it);
}));
router.delete('/plan-items/:id', requirePerm('clinical.edit'), ah(async (req, res) => {
  const it = await M.PlanItem.findByPk(req.params.id); if (!it) throw httpError(404, 'Acte introuvable'); await scopedPlan(req, it.planId); await it.destroy(); res.json({ ok: true });
}));
router.post('/plans/:id/quote', requirePerm('finance.view'), ah(async (req, res) => {
  const pl = await scopedPlan(req, req.params.id);
  const q = await M.Quote.create({ number: await M.nextNumber('quote', `DEV-${new Date().getFullYear()}-`, 4), patientId: pl.patientId, dentistId: pl.dentistId, date: D.today(), valid: D.add(D.today(), 60), status: 'brouillon', items: pl.items.filter(i => i.status !== 'termine').map(i => ({ label: i.label, tooth: i.tooth, qty: 1, price: i.price, disc: 0 })), discount: 0, conditions: 'Devis valable 60 jours. Acompte de 30 % à l’acceptation. Solde à la fin du traitement.', planId: pl.id });
  await audit(req, 'Devis généré depuis le plan', q.number); res.status(201).json(q);
}));
router.post('/plans/:id/invoice', requirePerm('finance.edit'), ah(async (req, res) => {
  const pl = await scopedPlan(req, req.params.id); const items = pl.items.filter(i => i.status === 'termine' && !i.invoiced && i.paid < i.price);
  if (!items.length) throw httpError(400, 'Aucun acte réalisé à facturer');
  const p = await M.Patient.findByPk(pl.patientId);
  const inv = await createInvoice({ patient: p, dentistId: pl.dentistId, items: items.map(i => ({ label: i.label, tooth: i.tooth, qty: 1, price: i.price - i.paid })), planId: pl.id });
  await M.PlanItem.update({ invoiced: true }, { where: { id: items.map(i => i.id) } });
  await audit(req, 'Facture générée depuis le plan', inv.number); res.status(201).json(inv);
}));

/* =================== ORDONNANCES =================== */
router.get('/prescriptions', requirePerm('clinical.view'), ah(async (req, res) => {
  const where = req.query.patient ? { patientId: (await scopedPatient(req, req.query.patient)).id } : { patientId: { [Op.in]: await scopedPids(req) } };
  res.json(await withPatients(await M.Prescription.findAll({ where, order: [['date', 'DESC']] })));
}));
router.post('/prescriptions', requirePerm('clinical.edit'), ah(async (req, res) => {
  const d = z.object({ patientId: z.string(), items: z.array(z.object({ drug: z.string().min(1), pos: z.string().default(''), dur: z.string().default('') })).min(1, 'Ajoutez un médicament'), notes: z.string().optional() }).parse(req.body);
  const p = await scopedPatient(req, d.patientId);
  const rx = await M.Prescription.create({ patientId: p.id, dentistId: req.user.role === 'dentiste' ? req.user.id : p.dentistId, date: D.today(), items: d.items, notes: d.notes || '' });
  await audit(req, 'Ordonnance générée', pname(p)); res.status(201).json(rx);
}));

/* =================== ORTHODONTIE =================== */
router.get('/ortho', requirePerm('clinical.view'), ah(async (req, res) => {
  const cases = await withPatients(await M.OrthoCase.findAll({ where: { patientId: { [Op.in]: await scopedPids(req) } } }));
  const next = await M.Appointment.findAll({ where: { patientId: cases.map(c => c.patientId), type: 'orthodontie', date: { [Op.gte]: D.today() } }, order: [['date', 'ASC']], raw: true });
  res.json(cases.map(c => ({ ...c, nextAppt: next.find(a => a.patientId === c.patientId) || null })));
}));
router.get('/ortho/:id', requirePerm('clinical.view'), ah(async (req, res) => {
  const o = await M.OrthoCase.findByPk(req.params.id); if (!o) throw httpError(404, 'Traitement introuvable'); await scopedPatient(req, o.patientId);
  const appts = await M.Appointment.findAll({ where: { patientId: o.patientId, type: 'orthodontie' }, order: [['date', 'DESC']], limit: 6 });
  res.json({ ...(await withPatients([o]))[0], appointments: appts });
}));
router.post('/ortho', requirePerm('clinical.edit'), ah(async (req, res) => {
  const d = z.object({ patientId: z.string(), appliance: z.string(), months: z.coerce.number().int().min(1).max(48), fee: z.coerce.number().min(0), start: z.string() }).parse(req.body);
  const p = await scopedPatient(req, d.patientId);
  const ortho = (await M.User.findOne({ where: { role: 'dentiste', spec: { [Op.like]: '%Orthodontie%' } } })) || { id: p.dentistId };
  const o = await M.OrthoCase.create({ ...d, dentistId: ortho.id, current: 0, paid: 0, stage: 'Début de traitement', steps: Array.from({ length: d.months + 1 }, (_, i) => ({ month: i, date: D.add(d.start, i * 30), done: i === 0, note: i === 0 ? 'Pose de l’appareil' : '', photo: false })) });
  if (!p.tags.includes('Orthodontie')) { p.tags = [...p.tags, 'Orthodontie']; await p.save(); }
  await audit(req, 'Traitement orthodontique créé', pname(p)); res.status(201).json(o);
}));
router.post('/ortho/:id/steps', requirePerm('clinical.edit'), ah(async (req, res) => {
  const o = await M.OrthoCase.findByPk(req.params.id); if (!o) throw httpError(404, 'Traitement introuvable'); const p = await scopedPatient(req, o.patientId);
  const d = z.object({ note: z.string().optional(), stage: z.string().optional(), photo: z.boolean().optional() }).parse(req.body);
  o.current = Math.min(o.months, o.current + 1); const steps = o.steps; const st = steps[o.current];
  Object.assign(st, { done: true, note: d.note || 'Contrôle et activation', photo: !!d.photo, date: D.today() }); o.steps = steps; if (d.stage) o.stage = d.stage;
  await o.save(); await audit(req, 'Suivi orthodontique', `${pname(p)} — mois ${o.current}`); res.json(o);
}));
router.post('/ortho/:id/payment', requirePerm('finance.edit'), ah(async (req, res) => {
  const o = await M.OrthoCase.findByPk(req.params.id); if (!o) throw httpError(404, 'Traitement introuvable'); const p = await scopedPatient(req, o.patientId);
  const amt = Math.min(o.fee - o.paid, Math.round(o.fee / o.months)); if (amt <= 0) throw httpError(400, 'Forfait déjà soldé');
  o.paid += amt; await o.save();
  await M.Payment.create({ patientId: p.id, clinicId: p.clinicId, date: D.today(), amount: amt, method: 'carte', kind: 'paiement', ref: 'Mensualité orthodontie' });
  await audit(req, 'Mensualité orthodontie encaissée', pname(p)); res.json({ amount: amt, ortho: o });
}));

module.exports = router;
