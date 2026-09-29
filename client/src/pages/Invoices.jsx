import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { patch, post, useAction, useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { useActions, PatientPicker } from '../components/Modals';
import { Async, Avatar, Card, Chips, Empty, Field, Icon, Kpi, MapBadge, Modal, PageHead, Progress, useRun } from '../ui';
import { InvoiceDoc, printDoc } from '../lib/paper';
import { D, fmt, pname, INV_ST } from '../lib/format';

export function InvoicesPage() {
  const { can } = useAuth(); const actions = useActions(); const nav = useNavigate(); const [sp, setSp] = useSearchParams();
  const status = sp.get('statut') || 'toutes'; const [q, setQ] = useState(''); const [open, setOpen] = useState(false);
  const res = useGet('/invoices', { status, q });
  return <>
    <PageHead title="Facturation" sub="Factures, acomptes, remises et relances" actions={can('finance.edit') && <><button className="btn" onClick={() => actions.pay()}><Icon name="card" />Encaisser</button><button className="btn primary" onClick={() => setOpen(true)}><Icon name="plus" />Nouvelle facture</button></>} />
    <Async q={res}>{d => <>
      <div className="grid g4 mb-16"><Kpi label="Facturé ce mois" value={fmt.money(d.kpi.billedMonth)} icon="receipt" tone="tone-blue" foot={<span>{d.kpi.billedMonthN} factures</span>} /><Kpi label="Encaissé ce mois" value={fmt.money(d.kpi.collectedMonth)} icon="wallet" tone="tone-green" /><Kpi label="Reste à encaisser" value={fmt.money(d.kpi.open)} icon="clock" tone="tone-amber" foot={<span>{d.kpi.openN} factures ouvertes</span>} /><Kpi label="En retard" value={fmt.money(d.kpi.late)} icon="alert" tone="tone-red" foot={<span>{d.kpi.lateN} factures</span>} /></div>
      <div className="card"><div className="card-body row wrap between"><Chips value={status} onChange={k => setSp(k === 'toutes' ? {} : { statut: k })} options={[['toutes', 'Toutes'], ['impayees', 'À encaisser'], ['partielles', 'Partielles'], ['retard', 'En retard'], ['payees', 'Payées']]} />
        <div className="search" style={{ maxWidth: 260 }}><Icon name="search" /><input defaultValue={q} onKeyDown={e => e.key === 'Enter' && setQ(e.target.value)} onBlur={e => setQ(e.target.value)} placeholder="N° ou patient…" style={{ paddingRight: 12 }} /></div></div>
        <div className="table-wrap"><table className="table responsive"><thead><tr><th>N°</th><th>Patient</th><th>Date</th><th>Échéance</th><th className="num">Total</th><th className="num">Payé</th><th className="num">Reste</th><th>Statut</th><th /></tr></thead>
          <tbody>{d.rows.map(i => <tr key={i.id} className="click" onClick={() => nav(`/app/facturation/${i.id}`)}><td data-l="N°" className="nowrap"><b style={{ fontWeight: 500 }}>{i.number}</b></td><td data-l="Patient"><div className="row"><Avatar p={i.patient} size="sm" />{pname(i.patient)}</div></td><td data-l="Date">{fmt.date(i.date)}</td><td data-l="Échéance">{fmt.date(i.due)}</td><td data-l="Total" className="num">{fmt.money(i.total)}</td><td data-l="Payé" className="num">{fmt.money(i.paid)}</td><td data-l="Reste" className="num" style={i.due > 0 ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>{fmt.money(i.due)}</td><td data-l="Statut"><MapBadge map={INV_ST} value={i.status} /></td>
            <td>{i.status !== 'payee' && can('finance.edit') && <button className="btn xs" onClick={e => { e.stopPropagation(); actions.pay({ patientId: i.patientId, invoiceId: i.id }); }}>Encaisser</button>}</td></tr>)}
            {!d.rows.length && <tr><td colSpan={9}><Empty text="Aucune facture" icon="receipt" /></td></tr>}</tbody></table></div>
        {d.total > d.rows.length && <div className="card-body small muted center">{d.rows.length} factures affichées sur {d.total} — affinez la recherche</div>}</div></>}</Async>
    {open && <NewInvoice onClose={() => setOpen(false)} />}
  </>;
}
function NewInvoice({ onClose }) {
  const { meta } = useAuth(); const act = useAction(); const run = useRun(); const nav = useNavigate();
  const [f, setF] = useState({ patientId: '', code: meta.acts[0].code, tooth: '', qty: 1, price: meta.acts[0].price, due: D.add(D.today(), 30), discount: 0 });
  const set = (k, v) => setF(s => ({ ...s, [k]: v, ...(k === 'code' ? { price: meta.acts.find(a => a.code === v).price } : {}) }));
  const save = () => run(() => act(() => post('/invoices', { patientId: f.patientId, items: [{ label: meta.acts.find(a => a.code === f.code).label, tooth: f.tooth, qty: f.qty, price: f.price }], discount: f.discount, due: f.due })), i => `Facture ${i.number} créée`, 'receipt').then(i => nav(`/app/facturation/${i.id}`)).catch(() => { });
  return <Modal title="Nouvelle facture" size="lg" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" disabled={!f.patientId} onClick={save}>Créer la facture</button></>}>
    <div className="form-grid"><Field label="Patient" full><PatientPicker value={f.patientId} onChange={v => set('patientId', v)} autoFocus /></Field>
      <Field label="Acte"><select className="select" value={f.code} onChange={e => set('code', e.target.value)}>{meta.acts.map(a => <option key={a.code} value={a.code}>{a.label}</option>)}</select></Field>
      <div className="row"><Field label="Dent" style={{ width: 100 }}><input className="input" value={f.tooth} onChange={e => set('tooth', e.target.value)} /></Field><Field label="Qté" style={{ width: 80 }}><input className="input" type="number" min="1" value={f.qty} onChange={e => set('qty', +e.target.value)} /></Field><Field label="Prix" style={{ flex: 1 }}><input className="input" type="number" value={f.price} onChange={e => set('price', +e.target.value)} /></Field></div>
      <Field label="Échéance"><input type="date" className="input" value={f.due} onChange={e => set('due', e.target.value)} /></Field><Field label="Remise (%)"><input className="input" type="number" value={f.discount} onChange={e => set('discount', +e.target.value)} /></Field></div>
  </Modal>;
}

export function InvoicePage() {
  const { id } = useParams(); const q = useGet(`/invoices/${id}`); const pat = useGet(q.data ? `/patients/${q.data.patientId}` : null, { log: '0' });
  return <Async q={q}>{inv => pat.data ? <Detail inv={inv} patient={pat.data.patient} /> : null}</Async>;
}
function Detail({ inv, patient }) {
  const { can, meta } = useAuth(); const actions = useActions(); const act = useAction(); const run = useRun(); const [disc, setDisc] = useState(inv.discount || 0);
  const doc = <InvoiceDoc inv={inv} patient={patient} payments={inv.payments} meta={meta} />;
  return <>
    <div className="crumbs"><Link to="/app/facturation">Facturation</Link> › {inv.number}</div>
    <PageHead title={inv.number} sub={<><MapBadge map={INV_ST} value={inv.status} /> · {pname(patient)}</>} actions={<>
      <button className="btn" onClick={() => printDoc(doc)}><Icon name="download" />PDF</button>
      {can('comm.send') && inv.due > 0 && <button className="btn" onClick={() => run(() => post(`/invoices/${inv.id}/remind`), 'Rappel de paiement envoyé', 'send').catch(() => { })}><Icon name="send" />Rappel de paiement</button>}
      {can('finance.edit') && inv.due > 0 && <button className="btn primary" onClick={() => actions.pay({ patientId: inv.patientId, invoiceId: inv.id })}><Icon name="card" />Encaisser {fmt.money(inv.due)}</button>}
    </>} />
    <div className="grid igrid" style={{ gridTemplateColumns: 'minmax(0,1fr) 320px', alignItems: 'start' }}>
      <div style={{ minWidth: 0 }}>{doc}</div>
      <div className="col gap-16">
        <Card title="Règlement"><div className="row between"><span className="muted">Total</span><b>{fmt.money(inv.total)}</b></div><div className="row between mt-8"><span className="muted">Payé</span><b style={{ color: 'var(--success)' }}>{fmt.money(inv.paid)}</b></div><div className="mt-8"><Progress value={(inv.paid / (inv.total || 1)) * 100} tone="sage" /></div><div className="row between mt-12"><span className="muted">Reste à payer</span><b style={{ fontSize: 18, color: inv.due > 0 ? 'var(--danger)' : 'inherit' }}>{fmt.money(inv.due)}</b></div></Card>
        {can('finance.edit') && inv.due > 0 && <Card title="Remise"><div className="row"><input type="number" className="input sm" min="0" max="100" value={disc} onChange={e => setDisc(e.target.value)} style={{ width: 90 }} /><span className="small muted">%</span><button className="btn sm" onClick={() => run(() => act(() => patch(`/invoices/${inv.id}`, { discount: +disc })), 'Remise appliquée').catch(() => { })}>Appliquer</button></div></Card>}
        <Card title="Patient"><Link to={`/app/patients/${patient.id}`} className="row" style={{ color: 'inherit' }}><Avatar p={patient} size="sm" /><div><b style={{ fontWeight: 500 }}>{pname(patient)}</b><div className="xs muted">{patient.phone}</div></div></Link><div className="mt-12 small muted">Solde global patient : <b style={{ color: 'var(--ink)' }}>{fmt.money(inv.balance.due)}</b></div></Card>
      </div>
    </div>
    <style>{'@media (max-width:1100px){.igrid{grid-template-columns:1fr!important}}'}</style>
  </>;
}
