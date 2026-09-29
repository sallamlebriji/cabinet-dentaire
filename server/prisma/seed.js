/* =========================================================
   Nacre — seeder Prisma
   Remplit la base créée par les migrations Prisma avec le jeu de démonstration :
   3 cabinets, 11 comptes, ~170 patients, ~2 100 rendez-vous, factures, stock,
   laboratoire, messages, avis, orthodontie… (dates relatives au jour du seed).

   Exécution :  npx prisma db seed          (seed seul)
                npx prisma migrate reset     (recrée les tables + seed)
   ========================================================= */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Nacre2026!';

/* ---------- Génération des données (générateur partagé avec le prototype) ---------- */
global.window = global;
const mem = {};
global.localStorage = { getItem: k => mem[k], setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } };
require('../src/seed/demoData');
const S = global.Nacre.S;

/* ---------- Conversions vers les colonnes MySQL ---------- */
// JSON stocké en LONGTEXT
const j = v => (v === undefined || v === null ? null : JSON.stringify(v));
// Colonne DATE : 'AAAA-MM-JJ' → Date (minuit UTC, donc la date n'est jamais décalée)
const d = s => (s ? new Date(String(s).slice(0, 10) + 'T00:00:00.000Z') : null);
// Colonne DATETIME : l'API (Sequelize, timezone +01:00) stocke l'heure locale du Maroc.
// Prisma écrit en UTC : on décale donc de +1 h pour conserver la même convention.
const TZ_OFFSET_MIN = 60;
const dt = v => (v ? new Date(new Date(v).getTime() + TZ_OFFSET_MIN * 60000) : null);
const nn = v => (v === '' || v === undefined ? null : v);

/** Insertion par lots (limite de paramètres MySQL) avec compteur */
async function insert(label, model, rows, size = 400) {
  for (let i = 0; i < rows.length; i += size) await model.createMany({ data: rows.slice(i, i + size) });
  console.log(`  ${label.padEnd(26)} ${String(rows.length).padStart(5)}`);
}

const RULE_META = { r1: ['confirmation', 0], r2: ['before', -1440], r3: ['before', -180], r4: ['after', 120], r5: ['control', 0], r6: ['treatment', 0], r7: ['reinforced', -2880] };

async function main() {
  const t0 = Date.now();
  console.log('Seeder Prisma — Nacre\n');

  /* ---------- Organisation ---------- */
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await insert('Cabinets', prisma.clinic, S.clinics.map(c => ({ id: c.id, name: c.name, city: c.city, address: c.address, phone: c.phone, chairs: j(c.chairs) })));
  await insert('Utilisateurs', prisma.user, S.staff.map(s => ({
    id: s.id, first: s.first, last: s.last, title: s.title, role: s.role, isAdmin: !!s.admin || s.role === 'admin', spec: s.spec || null,
    clinicId: s.clinic, chair: s.chair || null, color: s.color, email: s.email, phone: s.phone, passwordHash: hash, twofaEnabled: false, active: true
  })));
  await insert('Rôles & permissions', prisma.rolePermission, Object.entries(S.rolePerms).map(([role, perms]) => ({ role, label: S.roles[role], perms: j(perms) })));
  const st = S.settings;
  await insert('Paramètres', prisma.setting, [
    { key: 'general', value: j({ group: st.group, legal: st.legal, ice: st.ice, inpe: st.inpe, rc: st.rc, hours: st.hours }) },
    { key: 'security', value: j({ twofaRequired: false, sessionTimeout: 30, ipAllow: false, encryption: st.security.encryption, backups: st.security.backups }) },
    { key: 'booking', value: j(st.booking) },
    { key: 'types', value: j(S.types) },
    { key: 'status', value: j(S.status) },
    { key: 'permsCatalog', value: j(S.perms) }
  ]);
  await insert('Catalogue des actes', prisma.act, S.acts.map(a => ({ code: a.code, label: a.label, price: a.price })));

  /* ---------- Patients & clinique ---------- */
  await insert('Patients', prisma.patient, S.patients.map(p => ({
    id: p.id, first: p.first, last: p.last, sex: p.sex, dob: d(p.dob), profession: p.profession, clinicId: p.clinic, phone: p.phone, email: p.email,
    address: p.address, emergency: j(p.emergency), cover: p.cover, coverNo: p.coverNo, fileNo: p.fileNo, history: j(p.history), allergies: j(p.allergies),
    meds: j(p.meds), smoker: p.smoker, dentistId: p.dentist, tags: j(p.tags), createdOn: d(p.created), avatar: p.avatar, notes: p.notes || null,
    noShows: p.noShows, lateCount: p.lateCount, reinforced: p.reinforced, consent: j(p.consent), source: p.tags.includes('Réservation en ligne') ? 'online' : 'cabinet'
  })));
  await insert('Rendez-vous', prisma.appointment, S.appts.map(a => ({
    id: a.id, patientId: a.patient, dentistId: a.dentist, clinicId: a.clinic, chair: a.chair, date: d(a.date), start: a.start, dur: a.dur,
    type: a.type, status: a.status, note: a.note || '', late: a.late || 0, moved: !!a.moved, source: a.source
  })));
  await insert('Consultations', prisma.consultation, S.consults.map(c => ({
    id: c.id, patientId: c.patient, dentistId: c.dentist, date: d(c.date), apptId: nn(c.appt), type: c.type, motif: c.motif, anamnese: c.anamnese,
    history: c.history || null, allergies: c.allergies || null, observations: c.observations, diagnosis: c.diagnosis, proposed: c.proposed, done: c.done, notes: c.notes || null
  })));
  await insert('Odontogrammes', prisma.odontoChart, Object.entries(S.odonto).map(([patientId, o]) => ({ patientId, teeth: j(o.teeth) })));
  await insert('Historique odontogramme', prisma.odontoHistory, Object.entries(S.odonto).flatMap(([patientId, o]) => o.history.map(h => ({ patientId, date: d(h.date), user: h.user, tooth: h.tooth, layer: h.layer, cond: h.c, action: h.action }))));
  await insert('Plans de traitement', prisma.plan, S.plans.map(p => ({ id: p.id, patientId: p.patient, dentistId: p.dentist, title: p.title, createdOn: d(p.created), status: p.status })));
  await insert('Actes des plans', prisma.planItem, S.plans.flatMap(p => p.items.map((i, k) => ({
    id: i.id, planId: p.id, label: i.label, tooth: i.tooth, price: i.price, status: i.status, planned: d(i.planned), done: d(i.done), paid: i.paid, invoiced: false, position: k
  }))));
  await insert('Orthodontie', prisma.orthoCase, S.ortho.map(o => ({ id: o.id, patientId: o.patient, dentistId: o.dentist, appliance: o.appliance, start: d(o.start), months: o.months, current: o.current, fee: o.fee, paid: o.paid, stage: o.stage, steps: j(o.steps) })));
  await insert('Ordonnances', prisma.prescription, S.rx.map(r => ({ id: r.id, patientId: r.patient, dentistId: r.dentist, date: d(r.date), items: j(r.items), notes: r.notes || null })));
  await insert('Documents & imagerie', prisma.document, S.docs.map(x => ({ id: x.id, patientId: x.patient, kind: x.kind, title: x.title, date: d(x.date), cat: x.cat, seed: x.seed, shared: !!x.shared, consult: x.consult || null, fromPortal: false, reviewed: true })));
  await insert('Avant / après', prisma.beforeAfter, S.ba.map(b => ({ id: b.id, patientId: b.patient, title: b.title, cat: b.cat, before: d(b.before), after: d(b.after), shade: j(b.shade), visibility: b.visibility, consent: !!b.consent, crowd: !!b.crowd })));
  await insert('Documents générés', prisma.generatedDoc, S.gendocs.map(g => ({ id: g.id, type: g.type, patientId: g.patient, date: d(g.date), title: g.title, dentistId: g.dentist, body: g.body || null })));

  /* ---------- Finance ---------- */
  await insert('Devis', prisma.quote, S.quotes.map(q => ({
    id: q.id, number: q.number, patientId: q.patient, dentistId: q.dentist, date: d(q.date), valid: d(q.valid), status: q.status, acceptedAt: d(q.acceptedAt),
    signature: q.signature || null, items: j(q.items), discount: q.discount || 0, conditions: q.conditions, planId: nn(q.plan)
  })));
  await insert('Factures', prisma.invoice, S.invoices.map(f => ({
    id: f.id, number: f.number, patientId: f.patient, clinicId: f.clinic, dentistId: f.dentist, date: d(f.date), due: d(f.due), items: j(f.items), discount: f.discount || 0, apptId: nn(f.appt), planId: nn(f.plan)
  })));
  await insert('Paiements', prisma.payment, S.payments.map(p => ({ id: p.id, invoiceId: nn(p.invoice), patientId: p.patient, clinicId: p.clinic, date: d(p.date), amount: p.amount, method: p.method, kind: p.kind, ref: p.ref || null })));

  /* ---------- Opérations ---------- */
  await insert('Fournisseurs', prisma.supplier, S.suppliers.map(s => ({ id: s.id, name: s.name, contact: s.contact, phone: s.phone, email: s.email, city: s.city, cats: j(s.cats), delay: s.delay, rating: s.rating })));
  await insert('Produits (stock)', prisma.product, S.stock.map(s => ({ id: s.id, clinicId: s.clinic, name: s.name, cat: s.cat, qty: s.qty, min: s.min, unit: s.unit, supplierId: s.sup, price: s.price, lot: s.lot, exp: d(s.exp) })));
  await insert('Commandes fournisseurs', prisma.purchaseOrder, S.orders.map(o => ({ id: o.id, number: o.number, supplierId: o.supplier, clinicId: o.clinic, date: d(o.date), status: o.status, lines: j(o.lines), expected: d(o.expected), received: d(o.received) })));
  await insert('Laboratoires', prisma.lab, S.labs.map(l => ({ id: l.id, name: l.name, city: l.city, contact: l.contact, phone: l.phone, email: l.email, delay: l.delay, specialties: j(l.specialties) })));
  await insert('Travaux de laboratoire', prisma.labCase, S.labCases.map(l => ({
    id: l.id, patientId: l.patient, labId: l.lab, type: l.type, teeth: l.teeth, shade: l.shade, sent: d(l.sent), due: d(l.due), status: l.status, price: l.price, notes: l.notes || null, received: d(l.received), dentistId: l.dentist, clinicId: l.clinic
  })));

  /* ---------- Relation patient ---------- */
  await insert('Messages', prisma.message, S.messages.map(m => ({ id: m.id, patientId: m.patient, dir: m.dir, channel: m.channel, text: m.text, at: dt(m.at), auto: !!m.auto, status: m.status, seen: true })));
  await insert('Modèles de messages', prisma.template, S.templates.map(t => ({ id: t.id, cat: t.cat, name: t.name, text: t.text })));
  await insert('Règles de rappel', prisma.reminderRule, S.rules.map(r => ({ id: r.id, name: r.name, when: r.when, kind: RULE_META[r.id][0], offsetMinutes: RULE_META[r.id][1], channels: j(r.channels), on: r.on, templateId: r.template, sent: r.sent })));
  await insert('Suivis', prisma.followup, S.followups.map(f => ({ id: f.id, patientId: f.patient, type: f.type, due: d(f.due), note: f.note, status: f.status, auto: !!f.auto })));
  await insert('Avis patients', prisma.review, S.reviews.map(r => ({ id: r.id, patientId: r.patient, dentistId: r.dentist, clinicId: r.clinic, date: d(r.date), rating: r.rating, comment: r.comment || null })));

  /* ---------- Système ---------- */
  await insert('Journal d’audit', prisma.auditLog, S.audit.map(a => ({ at: dt(a.at), user: a.user, action: a.action, target: a.target, ip: a.ip })));
  await insert('Notifications', prisma.notification, S.notifications.map(n => ({ id: n.id, at: dt(n.at), kind: n.kind, title: n.title, text: n.text, link: n.link.replace(/^#/, ''), read: !!n.read, clinicId: 'fes' })));
  await insert('Statistiques mensuelles', prisma.monthlyStat, Object.entries(S.history).flatMap(([clinicId, arr]) => arr.map(h => ({ clinicId, month: d(h.m), revenue: h.revenue, consults: h.consults, newPatients: h.newPatients, noshow: h.noshow, fill: h.fill, recurrent: h.recurrent }))));
  await insert('Compteurs de numérotation', prisma.counter, [
    { key: 'invoice', value: S.seq.invoice }, { key: 'quote', value: S.seq.quote }, { key: 'order', value: S.seq.order }, { key: 'file', value: 1300 + S.patients.length }
  ]);

  console.log(`\n✓ Données de démonstration chargées en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  console.log(`  Comptes : ${S.staff.map(s => s.email).join(', ')}`);
  console.log(`  Mot de passe de démonstration : ${DEMO_PASSWORD}`);
}

main()
  .catch(e => { console.error('✗ Seed impossible :', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
