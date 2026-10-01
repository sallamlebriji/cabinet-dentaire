const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const { z } = require('zod');
const cfg = require('../config');
const M = require('../models');
const { requireStaff, openSession, closeSession, security, rolePerms } = require('../middleware/auth');
const { audit } = require('../services/core');
const { ah, httpError, staffName } = require('../utils/helpers');

authenticator.options = { window: 1 };
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Trop de tentatives, réessayez dans quelques minutes.' } });

async function mePayload(user, req) {
  const map = await rolePerms();
  const perms = [...new Set([...(map[user.role] || []), ...(user.isAdmin ? map.admin || [] : [])])];
  const clinics = (await M.Clinic.findAll({ attributes: ['id'] })).map(c => c.id);
  const allowed = user.clinicId === 'all' || user.isAdmin ? clinics : [user.clinicId];
  const u = user.toJSON(); delete u.passwordHash; delete u.twofaSecret;
  return { user: u, perms, allowedClinics: allowed, mustEnroll2fa: !!(req && req.mustEnroll) };
}

router.post('/login', limiter, ah(async (req, res) => {
  const { email, password } = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  const user = await M.User.scope('withSecrets').findOne({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    await M.AuditLog.create({ at: new Date(), user: email, action: 'Échec de connexion', target: 'Identifiants invalides', ip: req.ip });
    throw httpError(401, 'Email ou mot de passe incorrect');
  }
  if (!user.active) throw httpError(403, 'Compte désactivé');
  if (user.twofaEnabled) {
    const mfaToken = jwt.sign({ uid: user.id, purpose: 'mfa' }, cfg.jwtSecret, { expiresIn: '5m' });
    return res.json({ mfaRequired: true, mfaToken });
  }
  await openSession(req, res, { kind: 'staff', userId: user.id });
  user.lastLoginAt = new Date(); await user.save();
  req.user = user; await audit(req, 'Connexion', 'Session web');
  const sec = await security();
  res.json(await mePayload(user, { mustEnroll: sec.twofaRequired && !user.twofaEnabled }));
}));

router.post('/2fa/verify', limiter, ah(async (req, res) => {
  const { mfaToken, code } = z.object({ mfaToken: z.string(), code: z.string().regex(/^\d{6}$/) }).parse(req.body);
  let p; try { p = jwt.verify(mfaToken, cfg.jwtSecret); } catch { throw httpError(401, 'Délai dépassé, reconnectez-vous'); }
  if (p.purpose !== 'mfa') throw httpError(400, 'Jeton invalide');
  const user = await M.User.scope('withSecrets').findByPk(p.uid);
  if (!user || !authenticator.check(code, user.twofaSecret)) throw httpError(401, 'Code de vérification invalide');
  await openSession(req, res, { kind: 'staff', userId: user.id });
  user.lastLoginAt = new Date(); await user.save();
  req.user = user; await audit(req, 'Connexion (2FA)', 'Session web');
  res.json(await mePayload(user));
}));

/* Comptes de démonstration affichés sur l'écran de connexion (désactivable : DEMO_MODE=false) */
router.get('/demo-accounts', ah(async (req, res) => {
  if (!cfg.demoMode) return res.json({ enabled: false, accounts: [] });
  const users = await M.User.findAll({ where: { active: true }, order: [['role', 'ASC'], ['last', 'ASC']], attributes: ['email', 'first', 'last', 'title', 'role', 'isAdmin', 'clinicId'] });
  const roles = Object.fromEntries((await M.RolePermission.findAll()).map(r => [r.role, r.label]));
  const clinics = Object.fromEntries((await M.Clinic.findAll()).map(c => [c.id, c.city]));
  res.json({ enabled: true, password: 'Nacre2026!', accounts: users.map(u => ({ email: u.email, name: staffName(u), role: [roles[u.role], u.isAdmin && u.role !== 'admin' ? 'Admin' : '', u.clinicId === 'all' ? 'tous les sites' : clinics[u.clinicId]].filter(Boolean).join(' · ') })) });
}));

router.post('/logout', ah(async (req, res) => { await closeSession(req, res, 'staff'); res.json({ ok: true }); }));

router.get('/me', requireStaff, ah(async (req, res) => res.json(await mePayload(req.user))));

router.post('/2fa/setup', requireStaff, ah(async (req, res) => {
  const secret = authenticator.generateSecret();
  await M.User.update({ twofaSecret: secret }, { where: { id: req.user.id } });
  const g = (await M.Setting.findByPk('general')).value;
  const uri = authenticator.keyuri(req.user.email, `Nacre · ${g.group}`, secret);
  res.json({ secret, qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }) });
}));
router.post('/2fa/enable', requireStaff, ah(async (req, res) => {
  const { code } = z.object({ code: z.string().regex(/^\d{6}$/) }).parse(req.body);
  const user = await M.User.scope('withSecrets').findByPk(req.user.id);
  if (!user.twofaSecret || !authenticator.check(code, user.twofaSecret)) throw httpError(400, 'Code invalide — vérifiez l’heure de votre téléphone');
  user.twofaEnabled = true; await user.save(); await audit(req, 'Double authentification activée', staffName(user));
  res.json({ ok: true });
}));
router.post('/2fa/disable', requireStaff, ah(async (req, res) => {
  const { password } = z.object({ password: z.string() }).parse(req.body);
  const user = await M.User.scope('withSecrets').findByPk(req.user.id);
  if (!(await bcrypt.compare(password, user.passwordHash))) throw httpError(401, 'Mot de passe incorrect');
  const sec = await security(); if (sec.twofaRequired) throw httpError(400, 'La 2FA est obligatoire dans ce cabinet');
  user.twofaEnabled = false; user.twofaSecret = null; await user.save(); await audit(req, 'Double authentification désactivée', staffName(user));
  res.json({ ok: true });
}));
router.post('/password', requireStaff, limiter, ah(async (req, res) => {
  const { current, next } = z.object({ current: z.string(), next: z.string().min(10, 'Minimum 10 caractères') }).parse(req.body);
  const user = await M.User.scope('withSecrets').findByPk(req.user.id);
  if (!(await bcrypt.compare(current, user.passwordHash))) throw httpError(401, 'Mot de passe actuel incorrect');
  user.passwordHash = await bcrypt.hash(next, 12); await user.save();
  await audit(req, 'Mot de passe modifié', staffName(user)); res.json({ ok: true });
}));

module.exports = router;
