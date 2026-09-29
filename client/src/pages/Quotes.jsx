import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { patch, post, useAction, useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { Async, Avatar, Field, Icon, Kpi, MapBadge, Modal, PageHead, useRun } from '../ui';
import { PatientPicker } from '../components/Modals';
import { QuoteDoc, printDoc, quoteTotals } from '../lib/paper';
import { fmt, pname, sname, QUOTE_ST } from '../lib/format';

export function QuotesPage() {
  const { can } = useAuth(); const nav = useNavigate(); const q = useGet('/quotes'); const [open, setOpen] = useState(false);
  return <>
    <PageHead title="Devis" sub="Devis professionnels, envoi PDF et acceptation en ligne" actions={can('finance.edit') && <button className="btn primary" onClick={() => setOpen(true)}><Icon name="plus" />Nouveau devis</button>} />
    <Async q={q}>{list => { const tot = s => list.filter(x => x.effectiveStatus === s).reduce((a, x) => a + x.total, 0); const sent = list.filter(x => x.status !== 'brouillon').length;
      return <>
        <div className="grid g4 mb-16"><Kpi label="Devis en attente" value={list.filter(x => x.effectiveStatus === 'envoye').length} icon="clock" tone="tone-amber" foot={<span>{fmt.money(tot('envoye'))}</span>} /><Kpi label="Acceptés" value={list.filter(x => x.status === 'accepte').length} icon="check" tone="tone-green" foot={<span>{fmt.money(tot('accepte'))}</span>} /><Kpi label="Taux de conversion" value={Math.round((list.filter(x => x.status === 'accepte').length / (sent || 1)) * 100) + ' %'} icon="trend" tone="tone-blue" /><Kpi label="Brouillons" value={list.filter(x => x.status === 'brouillon').length} icon="edit" tone="tone-gray" /></div>
        <div className="card"><div className="table-wrap"><table className="table responsive"><thead><tr><th>N°</th><th>Patient</th><th>Date</th><th>Validité</th><th className="num">Montant</th><th>Statut</th></tr></thead>
          <tbody>{list.map(x => <tr key={x.id} className="click" onClick={() => nav(`/app/devis/${x.id}`)}><td data-l="N°"><b style={{ fontWeight: 500 }}>{x.number}</b></td><td data-l="Patient"><div className="row"><Avatar p={x.patient} size="sm" />{pname(x.patient)}</div></td><td data-l="Date">{fmt.date(x.date)}</td><td data-l="Validité">{fmt.date(x.valid)}</td><td data-l="Montant" className="num">{fmt.money(x.total)}</td><td data-l="Statut"><MapBadge map={QUOTE_ST} value={x.effectiveStatus} />{x.status === 'accepte' && x.signature && <span className="xs muted"> signé</span>}</td></tr>)}</tbody></table></div></div></>; }}</Async>
    {open && <NewQuote onClose={() => setOpen(false)} />}
  </>;
}
function NewQuote({ onClose }) {
  const act = useAction(); const run = useRun(); const nav = useNavigate(); const [pid, setPid] = useState('');
  return <Modal title="Nouveau devis" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" disabled={!pid} onClick={() => run(() => act(() => post('/quotes', { patientId: pid })), q => `Devis ${q.number} créé`, 'file').then(q => nav(`/app/devis/${q.id}`)).catch(() => { })}>Créer le brouillon</button></>}><Field label="Patient"><PatientPicker value={pid} onChange={setPid} autoFocus /></Field></Modal>;
}

export function QuotePage() {
  const { id } = useParams(); const q = useGet(`/quotes/${id}`); const pat = useGet(q.data ? `/patients/${q.data.patientId}` : null, { log: '0' });
  return <Async q={q}>{d => pat.data ? <Editor key={d.id + d.status} initial={d} patient={pat.data.patient} /> : null}</Async>;
}
function Editor({ initial, patient }) {
  const { can, meta, allDentists } = useAuth(); const act = useAction(); const run = useRun(); const nav = useNavigate();
  const [q, setQ] = useState(initial); const ed = can('finance.edit') && q.status === 'brouillon'; const timer = useRef(null);
  const [addCode, setAddCode] = useState(meta.acts[0].code);
  const save = next => { setQ(next); if (!ed) return; clearTimeout(timer.current); timer.current = setTimeout(() => patch(`/quotes/${q.id}`, { items: next.items, discount: next.discount, conditions: next.conditions, valid: next.valid, dentistId: next.dentistId }).catch(() => { }), 500); };
  useEffect(() => () => clearTimeout(timer.current), []);
  const setItem = (k, key, v) => save({ ...q, items: q.items.map((x, i) => (i === k ? { ...x, [key]: key === 'label' || key === 'tooth' ? v : +v } : x)) });
  const status = q.effectiveStatus || q.status; const doc = <QuoteDoc q={q} patient={patient} meta={meta} />;
  const flow = (url, msg, ic, then) => run(() => act(() => post(url)), msg, ic).then(then).catch(() => { });
  return <>
    <div className="crumbs"><Link to="/app/devis">Devis</Link> › {q.number}</div>
    <PageHead title={q.number} sub={<><MapBadge map={QUOTE_ST} value={status} /> · {pname(patient)} · {fmt.money(quoteTotals(q).total)}</>} actions={<>
      <button className="btn" onClick={() => printDoc(doc)}><Icon name="download" />Télécharger PDF</button>
      {ed && <button className="btn primary" onClick={() => flow(`/quotes/${q.id}/send`, 'Devis envoyé par email · disponible sur le portail patient', 'send', r => setQ(r))}><Icon name="send" />Envoyer au patient</button>}
      {can('finance.edit') && q.status === 'envoye' && <><button className="btn success" onClick={() => flow(`/quotes/${q.id}/accept`, 'Devis accepté', 'check', r => setQ(r))}><Icon name="signature" />Marquer accepté</button><button className="btn danger" onClick={() => flow(`/quotes/${q.id}/refuse`, 'Devis refusé', 'x', r => setQ(r))}>Refusé</button></>}
      {q.status === 'accepte' && <><button className="btn" onClick={() => flow(`/quotes/${q.id}/to-plan`, 'Plan de traitement créé depuis le devis', 'clipboard', pl => nav(`/app/plans/${pl.id}`))}><Icon name="clipboard" />Créer le plan</button><button className="btn primary" onClick={() => flow(`/quotes/${q.id}/deposit`, 'Facture d’acompte créée', 'receipt', f => nav(`/app/facturation/${f.id}`))}><Icon name="receipt" />Facturer l’acompte</button></>}
    </>} />
    <div className="grid qgrid" style={{ gridTemplateColumns: 'minmax(0,380px) minmax(0,1fr)', alignItems: 'start' }}>
      <div className="card"><div className="card-head"><h3>{ed ? 'Édition' : 'Détails'}</h3>{!ed && <span className="xs muted">Lecture seule</span>}</div><div className="card-body col" style={{ gap: 12 }}>
        <div className="row"><Field label="Praticien" style={{ flex: 1 }}><select className="select sm" disabled={!ed} value={q.dentistId} onChange={e => save({ ...q, dentistId: e.target.value })}>{allDentists.map(d => <option key={d.id} value={d.id}>{sname(d)}</option>)}</select></Field><Field label="Validité" style={{ width: 140 }}><input type="date" className="input sm" disabled={!ed} value={q.valid} onChange={e => save({ ...q, valid: e.target.value })} /></Field></div>
        <div className="xs muted">Actes</div>
        {q.items.map((i, k) => <div key={k} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 10 }}><div className="row"><input className="input sm grow" disabled={!ed} value={i.label} onChange={e => setItem(k, 'label', e.target.value)} />{ed && <button className="btn xs ghost" onClick={() => save({ ...q, items: q.items.filter((_, j) => j !== k) })}><Icon name="trash" /></button>}</div>
          <div className="row mt-8" style={{ gap: 6 }}><input className="input sm" style={{ width: 70 }} placeholder="Dent" disabled={!ed} value={i.tooth} onChange={e => setItem(k, 'tooth', e.target.value)} /><input className="input sm" style={{ width: 60 }} type="number" min="1" title="Quantité" disabled={!ed} value={i.qty} onChange={e => setItem(k, 'qty', e.target.value)} /><input className="input sm" type="number" title="Prix" disabled={!ed} value={i.price} onChange={e => setItem(k, 'price', e.target.value)} /><input className="input sm" style={{ width: 80 }} type="number" title="Remise (DH)" disabled={!ed} value={i.disc || 0} onChange={e => setItem(k, 'disc', e.target.value)} /></div></div>)}
        {ed && <div className="row"><select className="select sm grow" value={addCode} onChange={e => setAddCode(e.target.value)}>{meta.acts.map(a => <option key={a.code} value={a.code}>{a.label}</option>)}</select><button className="btn sm" onClick={() => { const a = meta.acts.find(x => x.code === addCode); save({ ...q, items: [...q.items, { label: a.label, tooth: '', qty: 1, price: a.price, disc: 0 }] }); }}><Icon name="plus" />Ajouter</button></div>}
        <Field label="Remise globale (%)"><input type="number" min="0" max="50" className="input sm" disabled={!ed} value={q.discount} onChange={e => save({ ...q, discount: +e.target.value })} /></Field>
        <Field label="Conditions"><textarea className="textarea" style={{ minHeight: 70 }} disabled={!ed} value={q.conditions || ''} onChange={e => save({ ...q, conditions: e.target.value })} /></Field>
        <p className="xs muted"><Icon name="globe" size={12} style={{ display: 'inline', verticalAlign: -2 }} /> Une fois envoyé, le patient peut consulter, télécharger et <b>accepter le devis en ligne</b> depuis son espace patient (signature électronique horodatée).</p>
      </div></div>
      <div style={{ minWidth: 0 }}>{doc}</div>
    </div>
    <style>{'@media (max-width:1100px){.qgrid{grid-template-columns:1fr!important}}'}</style>
  </>;
}
