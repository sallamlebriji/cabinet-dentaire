import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { post, useAction, useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { useActions, PatientPicker } from '../components/Modals';
import { Async, Avatar, Badge, Card, Field, Icon, Kpi, Modal, PageHead, Progress, StatusBadge, useRun } from '../ui';
import { BeforeAfter } from '../components/Imaging';
import { smile } from '../lib/media';
import { D, age, fmt, pname, sname } from '../lib/format';

export function OrthoList() {
  const { can } = useAuth(); const q = useGet('/ortho'); const [open, setOpen] = useState(false);
  return <>
    <PageHead title="Orthodontie" sub="Suivi mensuel, appareils, évolution photo et paiements" actions={can('clinical.edit') && <button className="btn primary" onClick={() => setOpen(true)}><Icon name="plus" />Nouveau traitement</button>} />
    <Async q={q}>{list => <>
      <div className="grid g4 mb-16"><Kpi label="Patients en traitement" value={list.length} icon="users" tone="tone-violet" /><Kpi label="Contrôles planifiés" value={list.filter(o => o.nextAppt).length} icon="calendar" tone="tone-blue" /><Kpi label="Forfaits en cours" value={fmt.money(list.reduce((s, o) => s + o.fee, 0))} icon="wallet" tone="tone-gold" /><Kpi label="Reste à encaisser" value={fmt.money(list.reduce((s, o) => s + o.fee - o.paid, 0))} icon="receipt" tone="tone-red" /></div>
      <div className="grid g2">{list.map(o => <Link key={o.id} className="card hover" to={`/app/orthodontie/${o.id}`} style={{ color: 'inherit' }}><div className="card-body">
        <div className="row between"><div className="row"><Avatar p={o.patient} /><div><b>{pname(o.patient)}</b><div className="xs muted">{age(o.patient.dob)} ans · {o.appliance}</div></div></div><Badge label={o.stage} cls="tone-violet" dot={false} /></div>
        <div className="row between small mt-16"><span>Mois {o.current} / {o.months}</span><span className="muted">Fin prévue {fmt.month(D.add(o.start, o.months * 30))}</span></div>
        <div className="progress mt-8" style={{ height: 8 }}><i style={{ width: `${(o.current / o.months) * 100}%`, background: 'linear-gradient(90deg,var(--violet),var(--primary))' }} /></div>
        <div className="row between xs muted mt-12"><span>{o.nextAppt ? `Prochain contrôle : ${fmt.rel(o.nextAppt.date)} · ${o.nextAppt.start}` : 'Aucun contrôle planifié'}</span><span>Payé {fmt.money(o.paid)} / {fmt.money(o.fee)}</span></div>
      </div></Link>)}</div></>}</Async>
    {open && <NewOrtho onClose={() => setOpen(false)} />}
  </>;
}
function NewOrtho({ onClose }) {
  const act = useAction(); const run = useRun(); const nav = useNavigate();
  const [f, setF] = useState({ patientId: '', appliance: 'Bagues métalliques', months: 18, fee: 18000, start: D.today() });
  return <Modal title="Nouveau traitement orthodontique" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" disabled={!f.patientId} onClick={() => run(() => act(() => post('/ortho', f)), 'Traitement créé', 'activity').then(o => nav(`/app/orthodontie/${o.id}`)).catch(() => { })}>Créer</button></>}>
    <div className="col" style={{ gap: 12 }}><Field label="Patient"><PatientPicker value={f.patientId} onChange={v => setF(s => ({ ...s, patientId: v }))} autoFocus /></Field>
      <Field label="Appareil"><select className="select" value={f.appliance} onChange={e => setF(s => ({ ...s, appliance: e.target.value }))}>{['Bagues métalliques', 'Bagues céramiques', 'Aligneurs transparents', 'Appareil amovible (plaque)', 'Disjoncteur'].map(x => <option key={x}>{x}</option>)}</select></Field>
      <div className="row"><Field label="Durée (mois)" style={{ flex: 1 }}><input className="input" type="number" value={f.months} onChange={e => setF(s => ({ ...s, months: +e.target.value }))} /></Field><Field label="Forfait (DH)" style={{ flex: 1 }}><input className="input" type="number" value={f.fee} onChange={e => setF(s => ({ ...s, fee: +e.target.value }))} /></Field></div>
      <Field label="Date de début"><input className="input" type="date" value={f.start} onChange={e => setF(s => ({ ...s, start: e.target.value }))} /></Field></div>
  </Modal>;
}

export function OrthoDetail() {
  const { id } = useParams(); const q = useGet(`/ortho/${id}`);
  return <Async q={q}>{o => <Detail o={o} />}</Async>;
}
function Detail({ o }) {
  const { can, staff } = useAuth(); const actions = useActions(); const act = useAction(); const run = useRun(); const [step, setStep] = useState(false);
  const p = o.patient;
  return <>
    <div className="crumbs"><Link to="/app/orthodontie">Orthodontie</Link> › {pname(p)}</div>
    <PageHead title={pname(p)} sub={`${o.appliance} · ${sname(staff(o.dentistId))} · début ${fmt.date(o.start)}`} actions={<>{can('agenda.manage') && <button className="btn" onClick={() => actions.newAppt({ patientId: p.id, dentistId: o.dentistId, type: 'orthodontie', date: o.steps[o.current + 1] ? o.steps[o.current + 1].date : D.today() })}><Icon name="calendar" />Planifier le contrôle</button>}{can('clinical.edit') && o.current < o.months && <button className="btn primary" onClick={() => setStep(true)}><Icon name="plus" />Suivi du mois {o.current + 1}</button>}</>} />
    <Card className="mb-16" title="Timeline du traitement" actions={<Badge label={o.stage} cls="tone-violet" dot={false} />}><div style={{ overflowX: 'auto' }}><div style={{ display: 'flex', alignItems: 'flex-start', minWidth: Math.max(600, (o.months + 1) * 64), padding: '10px 4px 4px' }}>
      {o.steps.map((s, i) => <div key={i} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>{i > 0 && <div style={{ position: 'absolute', top: 13, right: '50%', width: '100%', height: 2, background: s.done ? 'var(--violet)' : 'var(--line)' }} />}
        <div style={{ position: 'relative', zIndex: 1, width: 28, height: 28, borderRadius: '50%', margin: '0 auto', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600, ...(s.done ? { background: 'var(--violet)', color: '#fff' } : i === o.current + 1 ? { background: '#fff', border: '2px solid var(--violet)', color: 'var(--violet)', boxShadow: '0 0 0 4px var(--violet-50)' } : { background: '#fff', border: '1.5px solid var(--line-2)', color: 'var(--faint)' }) }}>{s.photo ? <Icon name="image" size={13} /> : i === 0 ? '▶' : i === o.months ? '★' : i}</div>
        <div className="xs mt-8" style={{ fontWeight: 600, color: s.done ? 'var(--ink)' : 'var(--faint)' }}>{i === 0 ? 'Début' : i === o.months ? 'Fin' : 'M' + i}</div><div className="xs faint">{fmt.mshort(s.date)}</div></div>)}
    </div></div></Card>
    <div className="grid g-3-2">
      <Card title="Suivi mensuel"><div className="timeline">{o.steps.filter(s => s.done).reverse().map(s => <div key={s.month} className="tl-item"><span className="tl-dot" style={{ borderColor: 'var(--violet)' }}><i style={{ background: 'var(--violet)' }} /></span><div className="tl-date">{s.month === 0 ? 'Début' : 'Mois ' + s.month} · {fmt.date(s.date)}</div><div className="tl-card"><p className="small">{s.note}</p>{s.photo && <div className="row gap-6 mt-8">{[1, 2, 3].map(k => <div key={k} style={{ width: 88, borderRadius: 8, overflow: 'hidden', aspectRatio: '16/9' }} dangerouslySetInnerHTML={{ __html: smile('#F1E9D6', s.month * 7 + k, s.month < o.months * 0.6) }} />)}</div>}</div></div>)}</div></Card>
      <div className="col gap-16">
        <Card title="Évolution"><BeforeAfter before={smile('#F1E9D6', 11, true)} after={smile('#F4EEDF', 11, o.current < o.months * 0.5)} labels={['Début', 'Mois ' + o.current]} style={{ aspectRatio: '16/10' }} /></Card>
        <Card title="Paiements"><div className="row between"><span className="muted">Forfait</span><b>{fmt.money(o.fee)}</b></div><div className="row between mt-8"><span className="muted">Payé</span><b style={{ color: 'var(--success)' }}>{fmt.money(o.paid)}</b></div><div className="mt-8"><Progress value={(o.paid / o.fee) * 100} tone="sage" /></div><div className="row between mt-8"><span className="muted">Reste</span><b>{fmt.money(o.fee - o.paid)}</b></div><div className="xs muted mt-8">Échéancier : {fmt.money(Math.round(o.fee / o.months))} / mois</div>
          {can('finance.edit') && o.paid < o.fee && <button className="btn sm mt-12" onClick={() => run(() => act(() => post(`/ortho/${o.id}/payment`)), r => `Mensualité de ${fmt.money(r.amount)} encaissée`, 'card').catch(() => { })}><Icon name="card" />Encaisser une mensualité</button>}</Card>
        <Card title="Rendez-vous"><div className="list">{o.appointments.map(a => <div key={a.id} className="li click" onClick={() => actions.appt(a.id)}><div className="grow"><div className="t">{fmt.date(a.date)} · {a.start}</div></div><StatusBadge status={a.status} /></div>)}{!o.appointments.length && <div className="small muted">—</div>}</div></Card>
      </div>
    </div>
    {step && <StepModal o={o} onClose={() => setStep(false)} />}
  </>;
}
function StepModal({ o, onClose }) {
  const act = useAction(); const run = useRun(); const [note, setNote] = useState(''); const [stage, setStage] = useState(o.stage); const [photo, setPhoto] = useState(true);
  return <Modal title={`Suivi — mois ${o.current + 1}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" onClick={() => run(() => act(() => post(`/ortho/${o.id}/steps`, { note, stage, photo })), `Suivi du mois ${o.current + 1} enregistré`, 'activity').then(onClose).catch(() => { })}>Enregistrer</button></>}>
    <Field label="Observations & actes"><textarea className="textarea" value={note} onChange={e => setNote(e.target.value)} placeholder="Ex. : changement d’arc, élastiques…" /></Field>
    <Field label="Étape" style={{ marginTop: 12 }}><input className="input" value={stage} onChange={e => setStage(e.target.value)} /></Field>
    <label className="check mt-12"><input type="checkbox" checked={photo} onChange={e => setPhoto(e.target.checked)} /> Photos de suivi prises</label>
  </Modal>;
}
