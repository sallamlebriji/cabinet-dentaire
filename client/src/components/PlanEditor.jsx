import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { del, patch, post, useAction, useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { useActions } from './Modals';
import { Badge, Icon, MapBadge, Progress, useRun, cx } from '../ui';
import { PlanDoc, printDoc } from '../lib/paper';
import { fmt, pname, sname, PLAN_ST, PLAN_ORDER } from '../lib/format';

export const planTotals = pl => { const total = pl.items.reduce((s, i) => s + i.price, 0); const paid = pl.items.reduce((s, i) => s + i.paid, 0); const done = pl.items.filter(i => i.status === 'termine').length; return { total, paid, due: total - paid, done, n: pl.items.length }; };
export function PlanSummary({ plan }) {
  const t = planTotals(plan);
  return <><div className="row between small"><span>{t.done}/{t.n} actes réalisés</span><b>{fmt.money(t.total)}</b></div><div className="mt-8"><Progress value={t.n ? (t.done / t.n) * 100 : 0} /></div><div className="row between xs muted mt-8"><span>Payé {fmt.money(t.paid)}</span><span>Reste {fmt.money(t.due)}</span></div></>;
}
export function Pipeline({ current, onPick }) {
  const ci = PLAN_ORDER.indexOf(current);
  return <div className="pipeline">{PLAN_ORDER.map((s, i) => <span key={s} style={{ display: 'contents' }}>{i > 0 && <div className={cx('pipe-line', i <= ci && 'done')} />}<div className={cx('pipe', i < ci && 'done', i === ci && 'cur')} style={onPick ? { cursor: 'pointer' } : undefined} onClick={onPick ? () => onPick(s) : undefined}><span className="d">{i < ci ? '✓' : i + 1}</span>{PLAN_ST[s][0]}</div></span>)}</div>;
}

export default function PlanEditor({ plan }) {
  const { can, meta, staff } = useAuth(); const act = useAction(); const run = useRun(); const nav = useNavigate(); const actions = useActions();
  const ed = can('clinical.edit'); const t = planTotals(plan); const p = plan.patient;
  const [newAct, setNewAct] = useState(meta.acts[0].code); const [tooth, setTooth] = useState(''); const [price, setPrice] = useState(meta.acts[0].price);
  const pat = useGet(`/patients/${plan.patientId}`, { log: '0' });
  const doIt = (fn, msg, ic) => run(() => act(fn), msg, ic).catch(() => { });
  const payBadge = i => (i.paid >= i.price && i.price > 0 ? <Badge label="Payé" cls="st-termine" /> : i.paid > 0 ? <Badge label={fmt.money(i.paid)} cls="st-attente" /> : <Badge label="Non payé" cls="st-annule" />);
  return <div className="card mb-16">
    <div className="card-head" style={{ flexWrap: 'wrap' }}>
      <div><div className="row gap-6"><h3 style={{ fontSize: 16 }}>{plan.title}</h3><MapBadge map={PLAN_ST} value={plan.status} /></div><div className="sub">Patient : <Link to={`/app/patients/${plan.patientId}`}>{pname(p)}</Link> · {sname(staff(plan.dentistId))} · créé le {fmt.date(plan.createdOn)}</div></div>
      <div className="row wrap gap-6">
        {can('finance.view') && <button className="btn sm" onClick={() => run(() => act(() => post(`/plans/${plan.id}/quote`)), q => `Devis ${q.number} créé`, 'file').then(q => nav(`/app/devis/${q.id}`)).catch(() => { })}><Icon name="file" />Générer le devis</button>}
        {can('finance.edit') && <button className="btn sm" onClick={() => run(() => act(() => post(`/plans/${plan.id}/invoice`)), f => `Facture ${f.number} créée`, 'receipt').then(f => nav(`/app/facturation/${f.id}`)).catch(() => { })}><Icon name="receipt" />Facturer les actes réalisés</button>}
        {can('agenda.manage') && <button className="btn sm" onClick={() => { const n = plan.items.find(i => i.status !== 'termine'); actions.newAppt({ patientId: plan.patientId, dentistId: plan.dentistId, date: (n && n.planned) || undefined, note: n ? `${n.label}${n.tooth !== '—' ? ' ' + n.tooth : ''}` : '' }); }}><Icon name="calendar" />Planifier</button>}
        <button className="btn sm icon" title="Imprimer" disabled={!pat.data} onClick={() => printDoc(<PlanDoc plan={plan} patient={pat.data.patient} meta={meta} />)}><Icon name="printer" /></button>
      </div>
    </div>
    <div className="card-body">
      <div style={{ overflowX: 'auto', padding: '4px 0 14px' }}><Pipeline current={plan.status} onPick={ed ? s => doIt(() => patch(`/plans/${plan.id}`, { status: s }), 'Plan : ' + PLAN_ST[s][0]) : null} /></div>
      <div className="table-wrap" style={{ margin: '0 -20px' }}><table className="table responsive"><thead><tr><th>#</th><th>Traitement</th><th>Dent</th><th className="num">Prix</th><th>Statut</th><th>Date prévue</th><th>Date réalisée</th><th>Paiement</th>{ed && <th />}</tr></thead>
        <tbody>{plan.items.map((i, k) => <tr key={i.id}><td data-l="#" className="muted">{k + 1}</td><td data-l="Traitement"><b style={{ fontWeight: 500 }}>{i.label}</b></td><td data-l="Dent">{i.tooth}</td><td data-l="Prix" className="num">{fmt.money(i.price)}</td>
          <td data-l="Statut">{ed ? <select className="select sm" style={{ width: 130 }} value={i.status} onChange={e => doIt(() => patch(`/plan-items/${i.id}`, { status: e.target.value }), 'Acte mis à jour')}>{PLAN_ORDER.map(s => <option key={s} value={s}>{PLAN_ST[s][0]}</option>)}</select> : <MapBadge map={PLAN_ST} value={i.status} />}</td>
          <td data-l="Prévue">{ed ? <input type="date" className="input sm" style={{ width: 140 }} defaultValue={i.planned || ''} onBlur={e => e.target.value !== (i.planned || '') && doIt(() => patch(`/plan-items/${i.id}`, { planned: e.target.value || null }), 'Date prévue enregistrée')} /> : i.planned ? fmt.date(i.planned) : '—'}</td>
          <td data-l="Réalisée">{i.done ? fmt.date(i.done) : <span className="faint">—</span>}</td><td data-l="Paiement">{payBadge(i)}</td>
          {ed && <td><button className="btn xs ghost" title="Retirer" onClick={() => doIt(() => del(`/plan-items/${i.id}`), 'Acte retiré')}><Icon name="trash" /></button></td>}</tr>)}</tbody>
        <tfoot><tr><td /><td>Total traitement</td><td /><td className="num">{fmt.money(t.total)}</td><td colSpan={ed ? 5 : 4} /></tr></tfoot></table></div>
      {ed && <div className="row wrap mt-12" style={{ gap: 8 }}>
        <select className="select sm" style={{ width: 280 }} value={newAct} onChange={e => { setNewAct(e.target.value); setPrice(meta.acts.find(a => a.code === e.target.value).price); }}>{meta.acts.map(a => <option key={a.code} value={a.code}>{a.label} — {fmt.money(a.price)}</option>)}</select>
        <input className="input sm" placeholder="Dent (ex. 36)" style={{ width: 120 }} value={tooth} onChange={e => setTooth(e.target.value)} />
        <input className="input sm" type="number" style={{ width: 110 }} value={price} onChange={e => setPrice(e.target.value)} />
        <button className="btn sm" onClick={() => doIt(() => post(`/plans/${plan.id}/items`, { label: meta.acts.find(a => a.code === newAct).label, tooth, price: +price }), 'Acte ajouté au plan', 'clipboard')}><Icon name="plus" />Ajouter l’acte</button>
      </div>}
      <div className="grid g3 mt-16">
        <div className="card" style={{ background: 'var(--surface-2)' }}><div className="card-body"><div className="xs muted">Total traitement</div><div style={{ fontSize: 22, fontWeight: 600 }} className="mono">{fmt.money(t.total)}</div></div></div>
        <div className="card" style={{ background: 'var(--success-50)', borderColor: '#CDE9DB' }}><div className="card-body"><div className="xs muted">Payé</div><div style={{ fontSize: 22, fontWeight: 600, color: 'var(--success)' }} className="mono">{fmt.money(t.paid)}</div></div></div>
        <div className="card" style={{ background: t.due > 0 ? 'var(--danger-50)' : 'var(--surface-2)', borderColor: t.due > 0 ? '#F4D2D8' : 'var(--line)' }}><div className="card-body row between"><div><div className="xs muted">Reste</div><div style={{ fontSize: 22, fontWeight: 600, color: t.due > 0 ? 'var(--danger)' : 'inherit' }} className="mono">{fmt.money(t.due)}</div></div>{t.due > 0 && can('finance.edit') && <button className="btn sm primary" onClick={() => actions.pay({ patientId: plan.patientId })}>Encaisser</button>}</div></div>
      </div>
    </div>
  </div>;
}
