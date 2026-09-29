/* =========================================================
   Schéma MySQL (Sequelize) — Nacre Dental OS
   Identifiants VARCHAR (UID) ; colonnes JSON stockées en LONGTEXT
   pour une compatibilité MySQL 5.7/8 et MariaDB.
   ========================================================= */
const { DataTypes: T } = require('sequelize');
const sequelize = require('../config/db');
const { uid } = require('../utils/helpers');

const id = prefix => ({ type: T.STRING(40), primaryKey: true, defaultValue: () => uid(prefix) });
const json = (field, def = null) => ({
  type: T.TEXT('long'), allowNull: true,
  get() { const v = this.getDataValue(field); if (v == null) return def == null ? null : JSON.parse(JSON.stringify(def)); try { return JSON.parse(v); } catch { return def; } },
  set(v) { this.setDataValue(field, v == null ? null : JSON.stringify(v)); }
});
const dec = field => ({ type: T.DECIMAL(12, 2), defaultValue: 0, get() { const v = this.getDataValue(field); return v == null ? 0 : parseFloat(v); } });
const str = (n = 255) => ({ type: T.STRING(n), allowNull: true });
const txt = () => ({ type: T.TEXT, allowNull: true });
const day = () => ({ type: T.DATEONLY, allowNull: true });
const bool = (d = false) => ({ type: T.BOOLEAN, defaultValue: d });
const int = (d = 0) => ({ type: T.INTEGER, defaultValue: d });
const def = (name, attrs, opts = {}) => sequelize.define(name, attrs, { tableName: opts.table || undefined, ...opts });

/* ---------- Organisation ---------- */
const Clinic = def('Clinic', { id: id('cl'), name: str(120), city: str(80), address: str(), phone: str(40), chairs: json('chairs', []) });
const User = def('User', {
  id: id('u'), first: str(80), last: str(80), title: str(10), role: { type: T.STRING(20), allowNull: false },
  isAdmin: bool(), spec: str(120), clinicId: str(40), chair: str(40), color: str(10),
  email: { type: T.STRING(160), unique: true, allowNull: false }, phone: str(40),
  passwordHash: str(100), twofaEnabled: bool(), twofaSecret: str(64), active: bool(true), lastLoginAt: { type: T.DATE, allowNull: true }
}, { defaultScope: { attributes: { exclude: ['passwordHash', 'twofaSecret'] } }, scopes: { withSecrets: {} } });
const RolePermission = def('RolePermission', { role: { type: T.STRING(20), primaryKey: true }, label: str(60), perms: json('perms', []) });
const Session = def('Session', { id: id('ss'), kind: { type: T.STRING(10), defaultValue: 'staff' }, userId: str(40), patientId: str(40), ip: str(64), userAgent: str(255), lastSeenAt: T.DATE, revokedAt: { type: T.DATE, allowNull: true } });
const Setting = def('Setting', { key: { type: T.STRING(60), primaryKey: true }, value: json('value', {}) });
const Act = def('Act', { code: { type: T.STRING(12), primaryKey: true }, label: str(120), price: dec('price') });

/* ---------- Patients & clinique ---------- */
const Patient = def('Patient', {
  id: id('p'), first: str(80), last: str(80), sex: str(1), dob: day(), profession: str(120), clinicId: str(40),
  phone: str(40), email: str(160), address: str(), emergency: json('emergency', {}), cover: str(60), coverNo: str(40),
  fileNo: str(20), history: json('history', []), allergies: json('allergies', []), meds: json('meds', []), smoker: bool(),
  dentistId: str(40), tags: json('tags', []), createdOn: day(), avatar: str(10), notes: txt(), noShows: int(), lateCount: int(),
  reinforced: bool(), consent: json('consent', {}), source: str(40)
}, { indexes: [{ fields: ['clinic_id'] }, { fields: ['last', 'first'] }, { fields: ['phone'] }] });
const Appointment = def('Appointment', {
  id: id('a'), patientId: str(40), dentistId: str(40), clinicId: str(40), chair: str(40), date: day(), start: str(5), dur: int(30),
  type: str(20), status: str(12), note: str(500), late: int(), moved: bool(), source: { type: T.STRING(12), defaultValue: 'cabinet' }
}, { indexes: [{ fields: ['date', 'clinic_id'] }, { fields: ['patient_id'] }, { fields: ['dentist_id', 'date'] }] });
const Consultation = def('Consultation', {
  id: id('c'), patientId: str(40), dentistId: str(40), date: day(), apptId: str(40), type: str(20), motif: str(),
  anamnese: txt(), history: txt(), allergies: txt(), observations: txt(), diagnosis: txt(), proposed: txt(), done: txt(), notes: txt()
}, { indexes: [{ fields: ['patient_id', 'date'] }] });
const OdontoChart = def('OdontoChart', { patientId: { type: T.STRING(40), primaryKey: true }, teeth: json('teeth', {}) });
const OdontoHistory = def('OdontoHistory', { id: { type: T.INTEGER, autoIncrement: true, primaryKey: true }, patientId: str(40), date: day(), user: str(120), tooth: str(4), layer: str(10), cond: str(20), action: str(12) }, { indexes: [{ fields: ['patient_id'] }] });
const Plan = def('Plan', { id: id('tp'), patientId: str(40), dentistId: str(40), title: str(160), createdOn: day(), status: str(12) });
const PlanItem = def('PlanItem', { id: id('i'), planId: str(40), label: str(160), tooth: str(20), price: dec('price'), status: str(12), planned: day(), done: day(), paid: dec('paid'), invoiced: bool(), position: int() });
const OrthoCase = def('OrthoCase', { id: id('or'), patientId: str(40), dentistId: str(40), appliance: str(120), start: day(), months: int(12), current: int(), fee: dec('fee'), paid: dec('paid'), stage: str(120), steps: json('steps', []) });
const Prescription = def('Prescription', { id: id('rx'), patientId: str(40), dentistId: str(40), date: day(), items: json('items', []), notes: txt() });
const Document = def('Document', { id: id('doc'), patientId: str(40), kind: str(20), title: str(200), date: day(), cat: str(20), seed: int(1), shared: bool(), consult: str(160), fromPortal: bool(), reviewed: bool(true), filePath: str(255), mime: str(100), size: int() }, { indexes: [{ fields: ['patient_id'] }] });
const BeforeAfter = def('BeforeAfter', { id: id('ba'), patientId: str(40), title: str(160), cat: str(60), before: day(), after: day(), shade: json('shade', []), visibility: str(20), consent: bool(), crowd: bool() });
const GeneratedDoc = def('GeneratedDoc', { id: id('gd'), type: str(20), patientId: str(40), date: day(), title: str(200), dentistId: str(40), body: txt() });

/* ---------- Finance ---------- */
const Quote = def('Quote', { id: id('q'), number: str(30), patientId: str(40), dentistId: str(40), date: day(), valid: day(), status: str(12), acceptedAt: day(), signature: str(160), items: json('items', []), discount: dec('discount'), conditions: txt(), planId: str(40), sentAt: day() });
const Invoice = def('Invoice', { id: id('f'), number: str(30), patientId: str(40), clinicId: str(40), dentistId: str(40), date: day(), due: day(), items: json('items', []), discount: dec('discount'), apptId: str(40), planId: str(40) }, { indexes: [{ fields: ['patient_id'] }, { fields: ['clinic_id', 'date'] }] });
const Payment = def('Payment', { id: id('pay'), invoiceId: str(40), patientId: str(40), clinicId: str(40), date: day(), amount: dec('amount'), method: str(20), kind: str(20), ref: str(160) }, { indexes: [{ fields: ['invoice_id'] }, { fields: ['patient_id'] }, { fields: ['clinic_id', 'date'] }] });

/* ---------- Opérations ---------- */
const Supplier = def('Supplier', { id: id('sup'), name: str(120), contact: str(120), phone: str(40), email: str(160), city: str(80), cats: json('cats', []), delay: int(3), rating: dec('rating') });
const Product = def('Product', { id: id('st'), clinicId: str(40), name: str(160), cat: str(60), qty: int(), min: int(), unit: str(60), supplierId: str(40), price: dec('price'), lot: str(40), exp: day() });
const PurchaseOrder = def('PurchaseOrder', { id: id('po'), number: str(20), supplierId: str(40), clinicId: str(40), date: day(), status: str(12), lines: json('lines', []), expected: day(), received: day() });
const Lab = def('Lab', { id: id('lab'), name: str(120), city: str(80), contact: str(120), phone: str(40), email: str(160), delay: int(7), specialties: json('specialties', []) });
const LabCase = def('LabCase', { id: id('lb'), patientId: str(40), labId: str(40), type: str(120), teeth: str(60), shade: str(20), sent: day(), due: day(), status: str(16), price: dec('price'), notes: txt(), received: day(), dentistId: str(40), clinicId: str(40) });

/* ---------- Relation patient ---------- */
const Message = def('Message', { id: id('m'), patientId: str(40), dir: str(4), channel: str(12), text: txt(), at: T.DATE, auto: bool(), status: str(12), seen: bool() }, { indexes: [{ fields: ['patient_id', 'at'] }] });
const Template = def('Template', { id: id('t'), cat: str(60), name: str(120), text: txt() });
const ReminderRule = def('ReminderRule', { id: id('r'), name: str(120), when: str(160), kind: str(20), offsetMinutes: int(), channels: json('channels', {}), on: bool(true), templateId: str(40), sent: int() });
const ReminderLog = def('ReminderLog', { id: { type: T.INTEGER, autoIncrement: true, primaryKey: true }, apptId: str(40), ruleId: str(40) }, { indexes: [{ unique: true, fields: ['appt_id', 'rule_id'] }] });
const Followup = def('Followup', { id: id('fu'), patientId: str(40), type: str(80), due: day(), note: str(255), status: str(12), auto: bool() });
const Review = def('Review', { id: id('rv'), patientId: str(40), dentistId: str(40), clinicId: str(40), date: day(), rating: int(5), comment: txt() });

/* ---------- Système ---------- */
const AuditLog = def('AuditLog', { id: { type: T.INTEGER, autoIncrement: true, primaryKey: true }, at: T.DATE, user: str(160), userId: str(40), action: str(200), target: str(255), ip: str(64) }, { updatedAt: false, indexes: [{ fields: ['at'] }] });
const Notification = def('Notification', { id: id('n'), at: T.DATE, kind: str(20), title: str(160), text: str(500), link: str(160), read: bool(), clinicId: str(40) });
const MonthlyStat = def('MonthlyStat', { id: { type: T.INTEGER, autoIncrement: true, primaryKey: true }, clinicId: str(40), month: day(), revenue: dec('revenue'), consults: int(), newPatients: int(), noshow: dec('noshow'), fill: int(), recurrent: int() });
const DemoRequest = def('DemoRequest', { id: { type: T.INTEGER, autoIncrement: true, primaryKey: true }, data: json('data', {}) });
const PatientOtp = def('PatientOtp', { id: id('otp'), patientId: str(40), codeHash: str(100), expiresAt: T.DATE, attempts: int() });
const Counter = def('Counter', { key: { type: T.STRING(20), primaryKey: true }, value: int() }, { timestamps: false });

/* ---------- Associations ---------- */
Patient.belongsTo(Clinic, { foreignKey: 'clinicId', constraints: false });
Appointment.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient', constraints: false });
Appointment.belongsTo(User, { foreignKey: 'dentistId', as: 'dentist', constraints: false });
Plan.hasMany(PlanItem, { foreignKey: 'planId', as: 'items', onDelete: 'CASCADE' });
PlanItem.belongsTo(Plan, { foreignKey: 'planId' });
Invoice.hasMany(Payment, { foreignKey: 'invoiceId', as: 'payments', constraints: false });
Payment.belongsTo(Invoice, { foreignKey: 'invoiceId', constraints: false });

/** Numérotation séquentielle atomique (factures, devis, commandes) */
async function nextNumber(key, prefix, width) {
  return sequelize.transaction(async t => {
    const [c] = await Counter.findOrCreate({ where: { key }, defaults: { value: 0 }, transaction: t, lock: t.LOCK.UPDATE });
    c.value += 1; await c.save({ transaction: t });
    return prefix + String(c.value).padStart(width, '0');
  });
}

module.exports = {
  sequelize, nextNumber,
  Clinic, User, RolePermission, Session, Setting, Act, Patient, Appointment, Consultation, OdontoChart, OdontoHistory,
  Plan, PlanItem, OrthoCase, Prescription, Document, BeforeAfter, GeneratedDoc, Quote, Invoice, Payment,
  Supplier, Product, PurchaseOrder, Lab, LabCase, Message, Template, ReminderRule, ReminderLog, Followup, Review,
  AuditLog, Notification, MonthlyStat, DemoRequest, PatientOtp, Counter
};
