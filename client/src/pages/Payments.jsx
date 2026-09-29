import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { useActions } from '../components/Modals';
import { Async, Avatar, Badge, Card, Icon, Kpi, PageHead, Progress } from '../ui';
import { BarChart, Donut } from '../ui/charts';
import { fmt, pname, METHOD, MC } from '../lib/format';

export default function Payments() {
  const { can } = useAuth(); const actions = useActions();
  const [method, setMethod] = useState('all'); const [kind, setKind] = useState('all'); const [q, setQ] = useState('');
  const res = useGet('/payments', { method, kind, q });
  const M4 = ['especes', 'carte', 'virement', 'en_ligne'];
  return <>
    <PageHead title="Paiements" sub="Encaissements, acomptes, remboursements et soldes patients" actions={can('finance.edit') && <button className="btn primary" onClick={() => actions.pay()}><Icon name="plus" />Enregistrer un paiement</button>} />
    <Async q={res}>{d => <>
      <div className="grid g4 mb-16"><Kpi label="Encaissé aujourd’hui" value={fmt.money(d.kpi.today)} icon="wallet" tone="tone-green" /><Kpi label="Encaissé ce mois" value={fmt.money(d.kpi.month)} icon="trend" tone="tone-blue" /><Kpi label="Acomptes du mois" value={fmt.money(d.kpi.deposits)} icon="layers" tone="tone-violet" /><Kpi label="Remboursements" value={fmt.money(d.kpi.refunds)} icon="repeat" tone="tone-red" /></div>
      <div className="grid g-3-2 mb-16">
        <Card title="Encaissements — 14 derniers jours"><BarChart labels={d.daily.map(x => fmt.dayMonth(x.date))} stacked height={220} fmtV={fmt.money} series={M4.map(m => ({ name: METHOD[m], color: MC[m], data: d.daily.map(x => x[m]) }))} /><div className="legend mt-8">{M4.map(m => <span key={m}><i style={{ background: MC[m] }} />{METHOD[m]}</span>)}</div></Card>
        <Card title="Modes de paiement (mois)"><Donut data={d.byMethod.map(x => ({ label: METHOD[x.method], value: x.value, color: MC[x.method] }))} center={fmt.k(d.byMethod.reduce((s, x) => s + x.value, 0))} sub="DH" fmtV={fmt.money} /></Card>
      </div>
      <div className="grid g-2-1">
        <div className="card"><div className="card-body row wrap" style={{ gap: 8 }}><div className="search" style={{ maxWidth: 220 }}><Icon name="search" /><input defaultValue={q} onKeyDown={e => e.key === 'Enter' && setQ(e.target.value)} onBlur={e => setQ(e.target.value)} placeholder="Patient…" style={{ paddingRight: 12 }} /></div>
          <select className="select sm" style={{ width: 170 }} value={method} onChange={e => setMethod(e.target.value)}><option value="all">Tous les modes</option>{Object.entries(METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select className="select sm" style={{ width: 170 }} value={kind} onChange={e => setKind(e.target.value)}><option value="all">Tous les types</option><option value="paiement">Paiements</option><option value="acompte">Acomptes</option><option value="remboursement">Remboursements</option></select></div>
          <div className="table-wrap"><table className="table responsive"><thead><tr><th>Date</th><th>Patient</th><th>Facture</th><th>Type</th><th>Mode</th><th className="num">Montant</th></tr></thead>
            <tbody>{d.rows.map(x => <tr key={x.id}><td data-l="Date">{fmt.date(x.date)}</td><td data-l="Patient"><Link to={`/app/patients/${x.patientId}`} className="row" style={{ color: 'inherit' }}><Avatar p={x.patient} size="sm" />{pname(x.patient)}</Link></td><td data-l="Facture">{x.invoiceNumber ? <Link to={`/app/facturation/${x.invoiceId}`}>{x.invoiceNumber}</Link> : '—'}</td>
              <td data-l="Type">{x.kind === 'acompte' ? <Badge label="Acompte" cls="tone-violet" dot={false} /> : x.kind === 'remboursement' ? <Badge label="Remboursement" cls="st-noshow" dot={false} /> : <Badge label="Paiement" cls="st-termine" dot={false} />}</td><td data-l="Mode">{METHOD[x.method]}</td><td data-l="Montant" className="num" style={{ fontWeight: 600, color: x.amount < 0 ? 'var(--danger)' : undefined }}>{fmt.money(x.amount)}</td></tr>)}</tbody></table></div></div>
        <Card title="Soldes patients" sub="Plus gros restes à payer"><div className="list">{d.balances.map(b => <div key={b.patientId} className="li"><div className="grow"><Link to={`/app/patients/${b.patientId}`} className="row" style={{ color: 'inherit' }}><Avatar p={b.patient} size="sm" /><b style={{ fontWeight: 500 }}>{pname(b.patient)}</b></Link><div className="mt-8"><Progress value={(b.paid / b.total) * 100} tone="sage" /></div><div className="row between xs muted mt-4"><span>Total {fmt.money(b.total)}</span><span>Payé {fmt.money(b.paid)}</span></div></div>
          <div className="right"><b style={{ color: 'var(--danger)' }} className="mono">{fmt.money(b.due)}</b>{can('finance.edit') && <div className="mt-4"><button className="btn xs" onClick={() => actions.pay({ patientId: b.patientId })}>Encaisser</button></div>}</div></div>)}</div></Card>
      </div></>}</Async>
  </>;
}
