/* Personnel, rôles & permissions, paramètres, sécurité, sessions, audit, export */
const router = require('express').Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { z } = require('zod');
const M = require('../models');
const { requirePerm, invalidateCaches } = require('../middleware/auth');
const { audit } = require('../services/core');
const { ah, D, staffName, httpError } = require('../utils/helpers');

/* =================== PERSONNEL =================== */
router.get('/staff', requirePerm('staff.manage', 'settings.manage'), ah(async (req, res) => {
  const users = await M.User.findAll({ where: { [Op.or]: [{ clinicId: { [Op.in]: req.clinics } }, { clinicId: 'all' }] }, order: [['role', 'ASC'], ['last', 'ASC']] });
  const t = D.today(); const m0 = D.monthStart();
  const stats = await Promise.all(users.filter(u => u.role === 'dentiste').map(async u => ({
    id: u.id, month: await M.Appointment.count({ where: { dentistId: u.id, date: { [Op.gte]: m0 } } }), today: await M.Appointment.count({ where: { dentistId: u.id, date: t } }),
    patients: await M.Patient.count({ where: { dentistId: u.id } }), rating: (await M.Review.findAll({ where: { dentistId: u.id }, attributes: ['rating'], raw: true })).reduce((s, r, _, a) => s + r.rating / a.length, 0)
  })));
  res.json({ users, stats: Object.fromEntries(stats.map(s => [s.id, s])) });
}));
router.post('/staff', requirePerm('staff.manage'), ah(async (req, res) => {
  const d = z.object({ first: z.string().min(1), last: z.string().min(1), role: z.enum(['admin', 'dentiste', 'assistant', 'secretaire', 'comptable', 'gestionnaire']), clinicId: z.string(), email: z.string().email(), spec: z.string().optional() }).parse(req.body);
  if (d.role === 'admin' && !req.user.isAdmin && req.user.role !== 'admin') throw httpError(403, 'Seul un administrateur peut créer un administrateur');
  if (await M.User.findOne({ where: { email: d.email.toLowerCase() } })) throw httpError(409, 'Cet email est déjà utilisé');
  const temp = crypto.randomBytes(6).toString('base64url') + '9!';
  const u = await M.User.create({ ...d, email: d.email.toLowerCase(), title: d.role === 'dentiste' ? 'Dr.' : '', spec: d.role === 'dentiste' ? d.spec || 'Omnipratique' : null, chair: 'Fauteuil 1', color: '#4B7BB5', passwordHash: await bcrypt.hash(temp, 12) });
  await audit(req, 'Membre ajouté', `${staffName(u)} (${d.role})`);
  // En production : envoi d'un lien d'activation à usage unique. En démo, le mot de passe temporaire est renvoyé une fois.
  res.status(201).json({ user: u, temporaryPassword: temp });
}));
router.patch('/staff/:id', requirePerm('staff.manage'), ah(async (req, res) => {
  const u = await M.User.findByPk(req.params.id); if (!u) throw httpError(404, 'Membre introuvable');
  const d = z.object({ role: z.string().optional(), clinicId: z.string().optional(), active: z.boolean().optional(), spec: z.string().optional(), phone: z.string().optional() }).parse(req.body);
  if (u.id === req.user.id && d.active === false) throw httpError(400, 'Vous ne pouvez pas désactiver votre propre compte');
  Object.assign(u, d); await u.save();
  if (d.active === false) await M.Session.update({ revokedAt: new Date() }, { where: { userId: u.id, revokedAt: null } });
  await audit(req, 'Membre modifié', staffName(u)); res.json(u);
}));
router.put('/roles/:role', requirePerm('staff.manage'), ah(async (req, res) => {
  if (req.params.role === 'admin') throw httpError(400, 'Le rôle Administrateur dispose de toutes les permissions');
  const r = await M.RolePermission.findByPk(req.params.role); if (!r) throw httpError(404, 'Rôle introuvable');
  const catalog = (await M.Setting.findByPk('permsCatalog')).value.map(p => p[0]);
  const { perms } = z.object({ perms: z.array(z.string()) }).parse(req.body);
  const before = new Set(r.perms); r.perms = perms.filter(p => catalog.includes(p)); await r.save(); invalidateCaches();
  const added = r.perms.filter(p => !before.has(p)), removed = [...before].filter(p => !r.perms.includes(p));
  await audit(req, 'Modification des permissions', `${r.label} ${added.length ? '+' + added.join(',') : ''} ${removed.length ? '−' + removed.join(',') : ''}`.trim()); res.json(r);
}));

/* =================== PARAMÈTRES =================== */
router.put('/settings/:key', requirePerm('settings.manage'), ah(async (req, res) => {
  if (!['general', 'security', 'booking'].includes(req.params.key)) throw httpError(400, 'Paramètre inconnu');
  const s = await M.Setting.findByPk(req.params.key); s.value = { ...s.value, ...req.body }; await s.save(); invalidateCaches();
  await audit(req, 'Paramètres modifiés', req.params.key + ' : ' + Object.keys(req.body).join(', ')); res.json(s.value);
}));
router.get('/sessions', requirePerm('settings.manage'), ah(async (req, res) => {
  const list = await M.Session.findAll({ where: { kind: 'staff', revokedAt: null, lastSeenAt: { [Op.gte]: new Date(Date.now() - 12 * 3600e3) } }, order: [['lastSeenAt', 'DESC']], limit: 30 });
  const users = Object.fromEntries((await M.User.findAll({ where: { id: list.map(s => s.userId) } })).map(u => [u.id, staffName(u)]));
  res.json(list.map(s => ({ ...s.toJSON(), user: users[s.userId], current: s.id === req.session.id })));
}));
router.delete('/sessions/:id', requirePerm('settings.manage'), ah(async (req, res) => {
  const s = await M.Session.findByPk(req.params.id); if (!s) throw httpError(404, 'Session introuvable');
  s.revokedAt = new Date(); await s.save(); await audit(req, 'Session révoquée', s.userAgent || ''); res.json({ ok: true });
}));
router.get('/audit', requirePerm('settings.manage'), ah(async (req, res) => {
  const q = req.query.q; const where = q ? { [Op.or]: ['user', 'action', 'target'].map(f => ({ [f]: { [Op.like]: `%${q}%` } })) } : {};
  const { rows, count } = await M.AuditLog.findAndCountAll({ where, order: [['at', 'DESC'], ['id', 'DESC']], limit: 200 });
  res.json({ rows, total: count });
}));
router.get('/export', requirePerm('settings.manage'), ah(async (req, res) => {
  const out = {}; for (const [name, model] of Object.entries(M.sequelize.models)) { if (['Session', 'PatientOtp'].includes(name)) continue; out[name] = await model.unscoped().findAll({ raw: true, attributes: { exclude: name === 'User' ? ['passwordHash', 'twofaSecret'] : [] } }); }
  await audit(req, 'Export complet des données', 'JSON');
  res.setHeader('Content-Disposition', `attachment; filename="nacre-export-${D.today()}.json"`); res.json(out);
}));
router.post('/backups', requirePerm('settings.manage'), ah(async (req, res) => {
  // En production : déclenchement d'un mysqldump chiffré vers un stockage hors site. Ici : journalisation.
  await audit(req, 'Sauvegarde manuelle déclenchée', 'Snapshot chiffré'); res.json({ ok: true, at: new Date() });
}));
router.get('/demo-requests', requirePerm('settings.manage'), ah(async (req, res) => res.json(await M.DemoRequest.findAll({ order: [['id', 'DESC']] }))));

module.exports = router;
