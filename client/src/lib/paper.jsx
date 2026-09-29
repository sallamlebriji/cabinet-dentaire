/* Documents à l'en-tête du cabinet — aperçu à l'écran et impression / « Enregistrer en PDF » */
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import Icon from '../ui/Icon';
import { fmt, sname, age, METHOD, PLAN_ST, D } from './format';

const findStaff = (meta, id) => (meta.staff || []).find(s => s.id === id);
const findClinic = (meta, id) => (meta.clinics || []).find(c => c.id === id) || (meta.clinics || [])[0] || {};
const muted = { fontSize: 12, color: '#6A788D' };

function Head({ meta, clinicId, title, number, date, extra }) {
  const c = findClinic(meta, clinicId); const g = meta.general || {};
  return <div className="doc-head">
    <div className="doc-logo"><div className="brand-mark" style={{ width: 46, height: 46, borderRadius: 13 }}><Icon name="tooth" size={24} /></div>
      <div><div style={{ fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--navy)', fontWeight: 500 }}>{g.group}</div><div style={{ fontSize: 11.5, color: '#6A788D', lineHeight: 1.5 }}>{c.name} · {c.address}<br />Tél. {c.phone} · ICE {g.ice}</div></div></div>
    <div style={{ textAlign: 'right' }}><div className="doc-title">{title}</div>{number && <div style={{ fontWeight: 600, marginTop: 2 }}>{number}</div>}<div style={muted}>{c.city}, le {fmt.date(date)}</div>{extra}</div>
  </div>;
}
function PatientBlock({ p, right }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginTop: 22, flexWrap: 'wrap' }}>
    <div style={{ background: '#F6F7F9', borderRadius: 10, padding: '12px 16px', minWidth: 240 }}><div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9AA5B4', fontWeight: 600 }}>Patient</div><div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>{p.first} {p.last}</div><div style={muted}>{p.address}{p.address && <br />}{p.phone} · Dossier {p.fileNo}{p.cover && <><br />Couverture : {p.cover}</>}</div></div>
    {right}
  </div>;
}
const Foot = ({ meta }) => <div className="foot">{meta.general.legal} · RC {meta.general.rc} · ICE {meta.general.ice} · Document généré par Nacre — Dental Practice OS</div>;
const Sign = ({ left, right }) => <div className="sign">{left && <div>{left}</div>}<div style={!left ? { maxWidth: 260, marginLeft: 'auto' } : undefined}>{right}</div></div>;
const Hand = ({ children }) => <span style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--navy)' }}>{children}</span>;

export const quoteTotals = q => { const sub = q.items.reduce((s, i) => s + i.qty * i.price, 0); const lineDisc = q.items.reduce((s, i) => s + (+i.disc || 0), 0); const glob = Math.round((sub - lineDisc) * (q.discount || 0) / 100); return { sub, lineDisc, glob, total: sub - lineDisc - glob }; };

export function QuoteDoc({ q, patient, meta }) {
  const d = findStaff(meta, q.dentistId); const t = quoteTotals(q);
  return <div className="paper">
    <Head meta={meta} clinicId={patient.clinicId} title="Devis" number={q.number} date={q.date} extra={<div style={muted}>Valable jusqu’au {fmt.date(q.valid)}</div>} />
    <PatientBlock p={patient} right={<div style={{ ...muted, textAlign: 'right' }}>Praticien<br /><b style={{ color: '#1b2533', fontSize: 13 }}>{sname(d)}</b><br />{d && d.spec}</div>} />
    <table><thead><tr><th>Désignation</th><th>Dent</th><th style={{ textAlign: 'right' }}>Qté</th><th style={{ textAlign: 'right' }}>Prix unitaire</th><th style={{ textAlign: 'right' }}>Remise</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
      <tbody>{q.items.map((i, k) => <tr key={k}><td>{i.label}</td><td>{i.tooth || '—'}</td><td style={{ textAlign: 'right' }}>{i.qty}</td><td style={{ textAlign: 'right' }}>{fmt.money(i.price)}</td><td style={{ textAlign: 'right' }}>{+i.disc ? '− ' + fmt.money(i.disc) : '—'}</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt.money(i.qty * i.price - (+i.disc || 0))}</td></tr>)}</tbody></table>
    <div className="totals"><div><span>Sous-total</span><span>{fmt.money(t.sub)}</span></div>{t.lineDisc > 0 && <div><span>Remises sur actes</span><span>− {fmt.money(t.lineDisc)}</span></div>}{q.discount > 0 && <div><span>Remise globale ({q.discount} %)</span><span>− {fmt.money(t.glob)}</span></div>}<div className="grand"><span>Total TTC</span><span>{fmt.money(t.total)}</span></div></div>
    {q.status === 'accepte' && <div style={{ textAlign: 'right' }}><span className="stamp">Accepté</span></div>}
    <div style={{ marginTop: 22, fontSize: 12, color: '#33445C' }}><b>Conditions</b><p style={{ marginTop: 4, color: '#6A788D' }}>{q.conditions}</p><p style={{ marginTop: 6, color: '#9AA5B4', fontSize: 11 }}>Actes médicaux exonérés de TVA. Le plan de traitement peut être ajusté selon l’évolution clinique, après information du patient.</p></div>
    <Sign left={<>Signature du praticien<br /><Hand>{sname(d)}</Hand></>} right={<>Bon pour accord — signature du patient{q.signature && <><br /><Hand>{q.signature}</Hand><br /><span style={{ fontSize: 11 }}>Signé électroniquement le {fmt.date(q.acceptedAt)}</span></>}</>} />
    <Foot meta={meta} />
  </div>;
}

export function InvoiceDoc({ inv, patient, payments = [], meta }) {
  const sub = inv.items.reduce((s, i) => s + i.qty * i.price, 0);
  return <div className="paper">
    <Head meta={meta} clinicId={inv.clinicId} title="Facture" number={inv.number} date={inv.date} extra={<div style={muted}>Échéance : {fmt.date(inv.due)}</div>} />
    <PatientBlock p={patient} right={<div style={{ ...muted, textAlign: 'right' }}>Praticien<br /><b style={{ color: '#1b2533', fontSize: 13 }}>{sname(findStaff(meta, inv.dentistId))}</b><br />INPE {meta.general.inpe}</div>} />
    <table><thead><tr><th>Désignation</th><th>Dent</th><th style={{ textAlign: 'right' }}>Qté</th><th style={{ textAlign: 'right' }}>Prix unitaire</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
      <tbody>{inv.items.map((i, k) => <tr key={k}><td>{i.label}</td><td>{i.tooth || '—'}</td><td style={{ textAlign: 'right' }}>{i.qty}</td><td style={{ textAlign: 'right' }}>{fmt.money(i.price)}</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt.money(i.qty * i.price)}</td></tr>)}</tbody></table>
    <div className="totals"><div><span>Sous-total</span><span>{fmt.money(sub)}</span></div>{inv.discount > 0 && <div><span>Remise ({inv.discount} %)</span><span>− {fmt.money(sub - inv.total)}</span></div>}<div className="grand"><span>Total</span><span>{fmt.money(inv.total)}</span></div><div><span>Déjà réglé</span><span>{fmt.money(inv.paid)}</span></div><div style={{ fontWeight: 700, color: inv.due > 0 ? '#CF4759' : '#2E9C6E' }}><span>Reste à payer</span><span>{fmt.money(inv.due)}</span></div></div>
    {inv.due <= 0 && <div style={{ textAlign: 'right' }}><span className="stamp">Acquittée</span></div>}
    {payments.length > 0 && <div style={{ marginTop: 18, fontSize: 12 }}><b>Règlements</b>{payments.map(x => <div key={x.id} style={{ display: 'flex', justifyContent: 'space-between', color: '#6A788D', padding: '3px 0', borderBottom: '1px dashed #EEF1F5' }}><span>{fmt.date(x.date)} · {METHOD[x.method]} · {x.kind}</span><span>{fmt.money(x.amount)}</span></div>)}</div>}
    <p style={{ marginTop: 18, fontSize: 11, color: '#9AA5B4' }}>Actes médicaux exonérés de TVA. Paiement par espèces, carte, virement ou en ligne depuis l’espace patient.</p>
    <Foot meta={meta} />
  </div>;
}

export function RxDoc({ rx, patient, meta }) {
  const d = findStaff(meta, rx.dentistId);
  return <div className="paper">
    <Head meta={meta} clinicId={patient.clinicId} title="Ordonnance" date={rx.date} />
    <div style={{ marginTop: 22, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}><div><div style={muted}>{sname(d)} — {(d && d.spec) || 'Chirurgien-dentiste'}</div><div style={muted}>INPE {meta.general.inpe}</div></div><div style={{ textAlign: 'right' }}><b>{patient.sex === 'F' ? 'Mme' : 'M.'} {patient.first} {patient.last}</b><div style={muted}>{age(patient.dob)} ans</div></div></div>
    <div style={{ marginTop: 28 }}>{rx.items.map((i, k) => <div key={k} style={{ padding: '12px 0', borderBottom: '1px solid #EEF1F5' }}><div style={{ fontWeight: 600, fontSize: 14 }}>{k + 1}. {i.drug}</div><div style={{ color: '#33445C', marginTop: 3 }}>{i.pos}</div><div style={{ ...muted, marginTop: 2 }}>Durée : {i.dur}</div></div>)}</div>
    {rx.notes && <p style={{ marginTop: 14, ...muted }}>{rx.notes}</p>}
    <Sign right={<>Signature et cachet<br /><Hand>{sname(d)}</Hand></>} />
    <Foot meta={meta} />
  </div>;
}

export function GenericDoc({ title, body, date, dentistId, patient, meta }) {
  return <div className="paper">
    <Head meta={meta} clinicId={patient.clinicId} title={title} date={date || D.today()} />
    <PatientBlock p={patient} />
    <div style={{ marginTop: 26, fontSize: 13.5, lineHeight: 1.75, color: '#1b2533', whiteSpace: 'pre-wrap' }}>{body}</div>
    <Sign right={<>Signature et cachet<br /><Hand>{sname(findStaff(meta, dentistId || patient.dentistId))}</Hand></>} />
    <Foot meta={meta} />
  </div>;
}

export function PlanDoc({ plan, patient, meta }) {
  const tot = plan.items.reduce((s, i) => s + i.price, 0), paid = plan.items.reduce((s, i) => s + i.paid, 0);
  return <div className="paper">
    <Head meta={meta} clinicId={patient.clinicId} title="Plan de traitement" number={plan.title} date={D.today()} />
    <PatientBlock p={patient} right={<div style={{ ...muted, textAlign: 'right' }}>Praticien<br /><b style={{ color: '#1b2533', fontSize: 13 }}>{sname(findStaff(meta, plan.dentistId))}</b></div>} />
    <table><thead><tr><th>#</th><th>Traitement</th><th>Dent</th><th>Statut</th><th>Date prévue</th><th style={{ textAlign: 'right' }}>Prix</th></tr></thead>
      <tbody>{plan.items.map((i, k) => <tr key={i.id}><td>{k + 1}</td><td>{i.label}</td><td>{i.tooth}</td><td>{PLAN_ST[i.status][0]}</td><td>{i.planned ? fmt.date(i.planned) : '—'}</td><td style={{ textAlign: 'right' }}>{fmt.money(i.price)}</td></tr>)}</tbody></table>
    <div className="totals"><div className="grand"><span>Total traitement</span><span>{fmt.money(tot)}</span></div><div><span>Payé</span><span>{fmt.money(paid)}</span></div><div style={{ fontWeight: 700 }}><span>Reste</span><span>{fmt.money(tot - paid)}</span></div></div>
    <Foot meta={meta} />
  </div>;
}

/** Imprime un document React (le navigateur propose « Enregistrer au format PDF ») */
export function printDoc(element) {
  const host = document.createElement('div'); host.className = 'print-area'; document.body.appendChild(host);
  const root = createRoot(host); flushSync(() => root.render(element));
  document.body.classList.add('printing');
  const done = () => { document.body.classList.remove('printing'); root.unmount(); host.remove(); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(() => { window.print(); setTimeout(done, 800); }, 80);
}
