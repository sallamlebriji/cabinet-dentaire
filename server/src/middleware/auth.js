/* Authentification (JWT en cookie httpOnly + sessions révocables), RBAC et cloisonnement multi-cabinets */
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const cfg = require('../config');
const { Session, User, RolePermission, Setting, Clinic, Patient } = require('../models');
const { httpError } = require('../utils/helpers');

const STAFF_COOKIE = 'nacre_sid';
const PATIENT_COOKIE = 'nacre_pid';
const cookieOpts = maxAgeMin => ({ httpOnly: true, sameSite: 'lax', secure: cfg.isProd, path: '/', maxAge: maxAgeMin * 60 * 1000 });

let permCache = { at: 0, map: {} }; let secCache = { at: 0, v: null };
async function rolePerms() { if (Date.now() - permCache.at > 10000) { const rows = await RolePermission.findAll(); permCache = { at: Date.now(), map: Object.fromEntries(rows.map(r => [r.role, r.perms])) }; } return permCache.map; }
async function security() { if (Date.now() - secCache.at > 10000) { const s = await Setting.findByPk('security'); secCache = { at: Date.now(), v: s ? s.value : {} }; } return secCache.v; }
const invalidateCaches = () => { permCache.at = 0; secCache.at = 0; };

async function openSession(req, res, { kind, userId, patientId }) {
  const sec = await security(); const minutes = kind === 'staff' ? (sec.sessionTimeout || cfg.sessionMinutes) : 60;
  const s = await Session.create({ kind, userId, patientId, ip: req.ip, userAgent: (req.get('user-agent') || '').slice(0, 250), lastSeenAt: new Date() });
  const token = jwt.sign({ sid: s.id, kind }, cfg.jwtSecret, { expiresIn: '12h' });
  res.cookie(kind === 'staff' ? STAFF_COOKIE : PATIENT_COOKIE, token, cookieOpts(minutes));
  return s;
}
async function closeSession(req, res, kind) {
  const name = kind === 'staff' ? STAFF_COOKIE : PATIENT_COOKIE; const tok = req.cookies[name];
  if (tok) { try { const p = jwt.verify(tok, cfg.jwtSecret); await Session.update({ revokedAt: new Date() }, { where: { id: p.sid } }); } catch { } }
  res.clearCookie(name, { path: '/' });
}

async function loadSession(req, res, kind) {
  const name = kind === 'staff' ? STAFF_COOKIE : PATIENT_COOKIE;
  const tok = req.cookies[name] || (kind === 'staff' && (req.get('authorization') || '').replace(/^Bearer /, ''));
  if (!tok) throw httpError(401, 'Authentification requise');
  let p; try { p = jwt.verify(tok, cfg.jwtSecret); } catch { throw httpError(401, 'Session expirée'); }
  if (p.kind !== kind) throw httpError(401, 'Session invalide');
  const s = await Session.findByPk(p.sid);
  const sec = await security(); const minutes = kind === 'staff' ? (sec.sessionTimeout || cfg.sessionMinutes) : 60;
  if (!s || s.revokedAt) throw httpError(401, 'Session révoquée');
  if (Date.now() - new Date(s.lastSeenAt).getTime() > minutes * 60000) { s.revokedAt = new Date(); await s.save(); throw httpError(401, 'Session expirée après inactivité'); }
  if (Date.now() - new Date(s.lastSeenAt).getTime() > 30000) { s.lastSeenAt = new Date(); await s.save(); res.cookie(name, tok, cookieOpts(minutes)); }
  return s;
}

/** Protège les routes de l'espace cabinet */
async function requireStaff(req, res, next) {
  try {
    const s = await loadSession(req, res, 'staff');
    const user = await User.findByPk(s.userId);
    if (!user || !user.active) throw httpError(401, 'Compte désactivé');
    const map = await rolePerms();
    const perms = new Set([...(map[user.role] || []), ...(user.isAdmin ? map.admin || [] : [])]);
    req.session = s; req.user = user; req.perms = perms; req.can = p => perms.has(p);
    // Cloisonnement : cabinets autorisés ∩ cabinet sélectionné (en-tête X-Clinic)
    const all = (await Clinic.findAll({ attributes: ['id'] })).map(c => c.id);
    const allowed = user.clinicId === 'all' || user.isAdmin ? all : [user.clinicId];
    const wanted = req.get('x-clinic');
    req.clinics = wanted && wanted !== 'all' && allowed.includes(wanted) ? [wanted] : allowed;
    req.allowedClinics = allowed;
    next();
  } catch (e) { next(e); }
}
const requirePerm = (...perms) => (req, res, next) => (perms.some(p => req.can(p)) ? next() : next(httpError(403, 'Permission requise : ' + perms.join(' ou '))));
const inScope = (req, field = 'clinicId') => ({ [field]: { [Op.in]: req.clinics } });
/** Charge un patient en vérifiant qu'il appartient au périmètre de l'utilisateur */
async function scopedPatient(req, id) {
  const p = await Patient.findByPk(id);
  if (!p || !req.allowedClinics.includes(p.clinicId)) throw httpError(404, 'Patient introuvable');
  return p;
}

/** Protège les routes du portail patient */
async function requirePatient(req, res, next) {
  try { const s = await loadSession(req, res, 'patient'); const p = await Patient.findByPk(s.patientId); if (!p) throw httpError(401, 'Compte patient introuvable'); req.session = s; req.patient = p; next(); } catch (e) { next(e); }
}

module.exports = { requireStaff, requirePerm, requirePatient, inScope, scopedPatient, openSession, closeSession, rolePerms, security, invalidateCaches };
