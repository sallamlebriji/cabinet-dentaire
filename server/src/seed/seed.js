/* Remplit MySQL avec le jeu de démonstration (3 cabinets, 11 comptes, ~170 patients, ~2 100 RDV).
   Les données sont générées relativement à la date du jour. */
const bcrypt = require('bcryptjs');
const M = require('../models');

// Le générateur est partagé avec le prototype (script navigateur) : on lui fournit un environnement minimal.
global.window = global;
const mem = {}; global.localStorage = { getItem: k => mem[k], setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } };
require('./demoData');
const S = global.Nacre.S;

const DEMO_PASSWORD = 'Nacre2026!';
const RULE_META = { r1: ['confirmation', 0], r2: ['before', -1440], r3: ['before', -180], r4: ['after', 120], r5: ['control', 0], r6: ['treatment', 0], r7: ['reinforced', -2880] };
const nn = v => (v === '' || v === undefined ? null : v);

(async () => {
  const t0 = Date.now();
  const bulk = (Model, rows) => Model.bulkCreate(rows, { validate: false });
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await bulk(M.Clinic, S.clinics);
  await bulk(M.User, S.staff.map(s => ({ id: s.id, first: s.first, last: s.last, title: s.title, role: s.role, isAdmin: !!s.admin || s.role === 'admin', spec: s.spec || null, clinicId: s.clinic, chair: s.chair || null, color: s.color, email: s.email, phone: s.phone, passwordHash: hash, twofaEnabled: false })));
  await bulk(M.RolePermission, Object.entries(S.rolePerms).map(([role, perms]) => ({ role, label: S.roles[role], perms })));
  const st = S.settings;
  await bulk(M.Setting, [
    { key: 'general', value: { group: st.group, legal: st.legal, ice: st.ice, inpe: st.inpe, rc: st.rc, hours: st.hours } },
    { key: 'security', value: { twofaRequired: false, sessionTimeout: 30, ipAllow: false, encryption: st.security.encryption, backups: st.security.backups } },
    { key: 'booking', value: st.booking },
    { key: 'types', value: S.types }, { key: 'status', value: S.status }, { key: 'permsCatalog', value: S.perms }
  ]);
  await bulk(M.Act, S.acts);

  await bulk(M.Patient, S.patients.map(p => ({ ...p, clinicId: p.clinic, dentistId: p.dentist, createdOn: p.created, source: p.tags.includes('Réservation en ligne') ? 'online' : 'cabinet' })));
  for (let i = 0; i < S.appts.length; i += 500) await bulk(M.Appointment, S.appts.slice(i, i + 500).map(a => ({ ...a, patientId: a.patient, dentistId: a.dentist, clinicId: a.clinic })));
  for (let i = 0; i < S.consults.length; i += 500) await bulk(M.Consultation, S.consults.slice(i, i + 500).map(c => ({ ...c, patientId: c.patient, dentistId: c.dentist, apptId: nn(c.appt) })));
  await bulk(M.OdontoChart, Object.entries(S.odonto).map(([patientId, o]) => ({ patientId, teeth: o.teeth })));
  await bulk(M.OdontoHistory, Object.entries(S.odonto).flatMap(([patientId, o]) => o.history.map(h => ({ patientId, date: h.date, user: h.user, tooth: h.tooth, layer: h.layer, cond: h.c, action: h.action }))));
  await bulk(M.Plan, S.plans.map(p => ({ id: p.id, patientId: p.patient, dentistId: p.dentist, title: p.title, createdOn: p.created, status: p.status })));
  await bulk(M.PlanItem, S.plans.flatMap(p => p.items.map((i, k) => ({ ...i, planId: p.id, planned: nn(i.planned), done: nn(i.done), position: k }))));
  await bulk(M.Quote, S.quotes.map(q => ({ ...q, patientId: q.patient, dentistId: q.dentist, planId: nn(q.plan), acceptedAt: nn(q.acceptedAt) })));
  for (let i = 0; i < S.invoices.length; i += 500) await bulk(M.Invoice, S.invoices.slice(i, i + 500).map(f => ({ id: f.id, number: f.number, patientId: f.patient, clinicId: f.clinic, dentistId: f.dentist, date: f.date, due: f.due, items: f.items, discount: f.discount || 0, apptId: nn(f.appt), planId: nn(f.plan) })));
  for (let i = 0; i < S.payments.length; i += 500) await bulk(M.Payment, S.payments.slice(i, i + 500).map(p => ({ ...p, invoiceId: nn(p.invoice), patientId: p.patient, clinicId: p.clinic })));

  await bulk(M.Supplier, S.suppliers);
  await bulk(M.Product, S.stock.map(s => ({ ...s, clinicId: s.clinic, supplierId: s.sup })));
  await bulk(M.PurchaseOrder, S.orders.map(o => ({ ...o, supplierId: o.supplier, clinicId: o.clinic, expected: nn(o.expected), received: nn(o.received) })));
  await bulk(M.Lab, S.labs);
  await bulk(M.LabCase, S.labCases.map(l => ({ ...l, patientId: l.patient, labId: l.lab, dentistId: l.dentist, clinicId: l.clinic, sent: nn(l.sent), received: nn(l.received) })));

  await bulk(M.Message, S.messages.map(m => ({ ...m, patientId: m.patient, at: new Date(m.at), seen: true })));
  await bulk(M.Template, S.templates);
  await bulk(M.ReminderRule, S.rules.map(r => ({ ...r, kind: RULE_META[r.id][0], offsetMinutes: RULE_META[r.id][1], templateId: r.template })));
  await bulk(M.Followup, S.followups.map(f => ({ ...f, patientId: f.patient })));
  await bulk(M.Review, S.reviews.map(r => ({ ...r, patientId: r.patient, dentistId: r.dentist, clinicId: r.clinic })));
  await bulk(M.OrthoCase, S.ortho.map(o => ({ ...o, patientId: o.patient, dentistId: o.dentist })));
  await bulk(M.Document, S.docs.map(d => ({ ...d, patientId: d.patient, consult: d.consult || null })));
  await bulk(M.BeforeAfter, S.ba.map(b => ({ ...b, patientId: b.patient, after: nn(b.after) })));
  await bulk(M.Prescription, S.rx.map(r => ({ ...r, patientId: r.patient, dentistId: r.dentist })));
  await bulk(M.GeneratedDoc, S.gendocs.map(g => ({ ...g, patientId: g.patient, dentistId: g.dentist })));
  await bulk(M.AuditLog, S.audit.map(a => ({ ...a, at: new Date(a.at) })));
  await bulk(M.Notification, S.notifications.map(n => ({ ...n, at: new Date(n.at), clinicId: 'fes' })));
  await bulk(M.MonthlyStat, Object.entries(S.history).flatMap(([clinicId, arr]) => arr.map(h => ({ clinicId, month: h.m, revenue: h.revenue, consults: h.consults, newPatients: h.newPatients, noshow: h.noshow, fill: h.fill, recurrent: h.recurrent }))));
  await bulk(M.Counter, [{ key: 'invoice', value: S.seq.invoice }, { key: 'quote', value: S.seq.quote }, { key: 'order', value: S.seq.order }, { key: 'file', value: 1300 + S.patients.length }]);

  console.log(`✓ Données de démonstration chargées en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  console.log(`  ${S.patients.length} patients · ${S.appts.length} rendez-vous · ${S.invoices.length} factures`);
  console.log(`  Comptes : ${S.staff.map(s => s.email).join(', ')}`);
  console.log(`  Mot de passe de démonstration : ${DEMO_PASSWORD}`);
  await M.sequelize.close();
})().catch(e => { console.error('✗ Seed impossible :', e); process.exit(1); });
