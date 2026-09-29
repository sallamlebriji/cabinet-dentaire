/* Référentiels chargés au démarrage du client + notifications */
const router = require('express').Router();
const { Op } = require('sequelize');
const M = require('../models');
const { ah } = require('../utils/helpers');

router.get('/meta', ah(async (req, res) => {
  const [clinics, staff, roles, acts, settings] = await Promise.all([
    M.Clinic.findAll({ order: [['id', 'ASC']] }), M.User.findAll({ where: { active: true }, order: [['role', 'ASC'], ['last', 'ASC']] }),
    M.RolePermission.findAll(), M.Act.findAll({ order: [['label', 'ASC']] }), M.Setting.findAll()
  ]);
  const st = Object.fromEntries(settings.map(s => [s.key, s.value]));
  // Ordre d'affichage stable : cabinet Fès, Meknès, Rabat
  const order = ['fes', 'meknes', 'rabat']; clinics.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  res.json({
    clinics, staff, acts,
    roles: Object.fromEntries(roles.map(r => [r.role, r.label])), rolePerms: Object.fromEntries(roles.map(r => [r.role, r.perms])),
    permsCatalog: st.permsCatalog, types: st.types, status: st.status, general: st.general, booking: st.booking, security: st.security
  });
}));

router.get('/notifications', ah(async (req, res) => {
  const list = await M.Notification.findAll({ where: { [Op.or]: [{ clinicId: { [Op.in]: req.clinics } }, { clinicId: null }] }, order: [['at', 'DESC']], limit: 30 });
  res.json(list);
}));
router.post('/notifications/read-all', ah(async (req, res) => { await M.Notification.update({ read: true }, { where: { clinicId: { [Op.in]: req.clinics } } }); res.json({ ok: true }); }));
router.post('/notifications/:id/read', ah(async (req, res) => { await M.Notification.update({ read: true }, { where: { id: req.params.id } }); res.json({ ok: true }); }));

/* Compteurs de la barre latérale */
router.get('/counters', ah(async (req, res) => {
  const { D } = require('../utils/helpers'); const t = D.today(); const sc = { clinicId: { [Op.in]: req.clinics } };
  const pids = (await M.Patient.findAll({ where: sc, attributes: ['id'], raw: true })).map(p => p.id);
  const [agenda, stock, lab, unread, fu] = await Promise.all([
    M.Appointment.count({ where: { ...sc, date: t, status: { [Op.ne]: 'annule' } } }),
    M.Product.count({ where: { ...sc, qty: { [Op.lte]: M.sequelize.col('min') } } }),
    M.LabCase.count({ where: { ...sc, status: 'pret' } }),
    M.Message.count({ where: { patientId: { [Op.in]: pids }, dir: 'in', status: 'non_lu' } }),
    M.Followup.count({ where: { patientId: { [Op.in]: pids }, status: { [Op.ne]: 'fait' }, due: { [Op.lte]: t } } })
  ]);
  const notifs = await M.Notification.count({ where: { read: false, clinicId: { [Op.in]: req.clinics } } });
  res.json({ agenda, stock, laboratoire: lab, communication: unread, suivis: fu, notifications: notifs });
}));

module.exports = router;
