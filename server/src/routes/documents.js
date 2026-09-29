const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { Op } = require('sequelize');
const { z } = require('zod');
const cfg = require('../config');
const M = require('../models');
const { requirePerm, inScope, scopedPatient } = require('../middleware/auth');
const { audit, withPatients, sendMessage, fillTemplate } = require('../services/core');
const { ah, D, pname, httpError } = require('../utils/helpers');

/* ---------- Stockage des fichiers (hors webroot, noms aléatoires) ---------- */
const ALLOWED = /^(image\/(jpeg|png|webp|gif)|application\/pdf)$/;
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => { const dir = path.join(cfg.uploadDir, D.today().slice(0, 7)); fs.mkdirSync(dir, { recursive: true }); cb(null, dir); },
    filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + (path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '') || ''))
  }),
  limits: { fileSize: 15 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => cb(ALLOWED.test(file.mimetype) ? null : Object.assign(new Error('Type de fichier non autorisé (JPG, PNG, WEBP, PDF)'), { status: 400 }), ALLOWED.test(file.mimetype))
});
module.exports.upload = upload;
const catOf = f => (f.mimetype === 'application/pdf' ? 'pdf' : /radio|pano|rx|retro|bitewing/i.test(f.originalname) ? 'radio' : 'photo');
const scopedPids = async req => (await M.Patient.findAll({ where: inScope(req), attributes: ['id'], raw: true })).map(p => p.id);

router.get('/documents', requirePerm('clinical.view'), ah(async (req, res) => {
  const { patient, cat } = req.query;
  const where = { patientId: patient && patient !== 'all' ? (await scopedPatient(req, patient)).id : { [Op.in]: await scopedPids(req) } };
  if (cat && cat !== 'all') where.cat = cat;
  res.json(await withPatients(await M.Document.findAll({ where, order: [['date', 'DESC'], ['createdAt', 'DESC']] })));
}));
router.post('/documents', requirePerm('clinical.view'), upload.array('files', 10), ah(async (req, res) => {
  const p = await scopedPatient(req, req.body.patientId);
  if (!req.files || !req.files.length) throw httpError(400, 'Aucun fichier reçu');
  const docs = await Promise.all(req.files.map(f => M.Document.create({ patientId: p.id, kind: f.mimetype === 'application/pdf' ? 'pdf' : 'upload', title: path.basename(f.originalname, path.extname(f.originalname)).slice(0, 190), date: D.today(), cat: req.body.cat || catOf(f), seed: 1, shared: false, reviewed: true, filePath: path.relative(cfg.uploadDir, f.path), mime: f.mimetype, size: f.size, consult: req.body.consult || null })));
  await audit(req, 'Documents importés', `${pname(p)} — ${docs.length} fichier(s)`); res.status(201).json(docs);
}));
router.get('/documents/:id/file', requirePerm('clinical.view'), ah(async (req, res) => {
  const d = await M.Document.findByPk(req.params.id); if (!d || !d.filePath) throw httpError(404, 'Fichier introuvable'); await scopedPatient(req, d.patientId);
  const abs = path.resolve(cfg.uploadDir, d.filePath); if (!abs.startsWith(path.resolve(cfg.uploadDir))) throw httpError(400, 'Chemin invalide');
  res.set('Cache-Control', 'private, max-age=300'); res.type(d.mime); res.sendFile(abs);
}));
router.patch('/documents/:id', requirePerm('clinical.view'), ah(async (req, res) => {
  const d = await M.Document.findByPk(req.params.id); if (!d) throw httpError(404, 'Document introuvable'); const p = await scopedPatient(req, d.patientId);
  const body = z.object({ shared: z.boolean().optional(), reviewed: z.boolean().optional(), title: z.string().optional() }).parse(req.body);
  Object.assign(d, body); await d.save();
  if (body.shared !== undefined) await audit(req, body.shared ? 'Document partagé au patient' : 'Partage retiré', `${d.title} — ${pname(p)}`);
  if (body.reviewed) await audit(req, 'Consultation imagerie', `${d.title} — ${pname(p)}`);
  res.json(d);
}));

/* ---------- Avant / Après (privé) ---------- */
router.get('/before-after', requirePerm('images.private'), ah(async (req, res) => {
  const where = { patientId: req.query.patient ? (await scopedPatient(req, req.query.patient)).id : { [Op.in]: await scopedPids(req) } };
  res.json(await withPatients(await M.BeforeAfter.findAll({ where, order: [['before', 'DESC']] })));
}));
router.patch('/before-after/:id', requirePerm('images.private'), ah(async (req, res) => {
  const b = await M.BeforeAfter.findByPk(req.params.id); if (!b) throw httpError(404, 'Introuvable'); await scopedPatient(req, b.patientId);
  const { visibility } = z.object({ visibility: z.enum(['praticiens', 'equipe', 'patient']) }).parse(req.body);
  if (visibility === 'patient' && !b.consent) throw httpError(400, 'Consentement photo manquant');
  b.visibility = visibility; await b.save(); await audit(req, 'Visibilité avant/après modifiée', `${b.title} → ${visibility}`); res.json(b);
}));

/* ---------- Documents générés ---------- */
router.get('/generated-docs', requirePerm('patients.view'), ah(async (req, res) => {
  res.json(await withPatients(await M.GeneratedDoc.findAll({ where: { patientId: { [Op.in]: await scopedPids(req) } }, order: [['date', 'DESC']], limit: 40 })));
}));
router.post('/generated-docs', requirePerm('clinical.edit'), ah(async (req, res) => {
  const d = z.object({ patientId: z.string(), type: z.enum(['certificat', 'compte_rendu']), title: z.string().min(1), body: z.string().min(1), share: z.boolean().optional() }).parse(req.body);
  const p = await scopedPatient(req, d.patientId);
  const g = await M.GeneratedDoc.create({ ...d, date: D.today(), dentistId: req.user.role === 'dentiste' ? req.user.id : p.dentistId });
  if (d.share) {
    await M.Document.create({ patientId: p.id, kind: 'pdf', title: d.title, date: D.today(), cat: 'pdf', seed: 1, shared: true, consult: 'gen:' + g.id });
    const tpl = await M.Template.findByPk('t6'); await sendMessage(p, await fillTemplate(tpl.text, p), 'email', { auto: true });
  }
  await audit(req, 'Document généré', `${d.title} — ${pname(p)}`); res.status(201).json(g);
}));

module.exports = router;
module.exports.upload = upload;
