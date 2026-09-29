import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { post, useAction, useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { Async, Avatar, Chips, Empty, Field, Icon, Kpi, MapBadge, Modal, PageHead, useRun } from '../ui';
import PlanEditor, { PlanSummary, planTotals } from '../components/PlanEditor';
import { PatientPicker } from '../components/Modals';
import { fmt, pname, PLAN_ST, PLAN_ORDER } from '../lib/format';

export function PlansPage() {
  const { can } = useAuth(); const q = useGet('/plans'); const [st, setSt] = useState('actifs'); const [open, setOpen] = useState(false);
  return <>
    <PageHead title="Plans de traitement" sub="Proposé → Accepté → Planifié → En cours → Terminé" actions={can('clinical.edit') && <button className="btn primary" onClick={() => setOpen(true)}><Icon name="plus" />Nouveau plan</button>} />
    <Async q={q}>{all => { const list = st === 'actifs' ? all.filter(p => p.status !== 'termine') : st === 'tous' ? all : all.filter(p => p.status === st); const acc = all.filter(p => p.status !== 'propose').length;
      return <>
        <div className="grid g4 mb-16"><Kpi label="Plans actifs" value={all.filter(p => p.status !== 'termine').length} icon="clipboard" tone="tone-blue" /><Kpi label="Taux d’acceptation" value={Math.round((acc / (all.length || 1)) * 100) + ' %'} icon="check" tone="tone-green" /><Kpi label="Montant total des plans" value={fmt.money(all.reduce((s, p) => s + planTotals(p).total, 0))} icon="wallet" tone="tone-gold" /><Kpi label="Reste à encaisser" value={fmt.money(all.reduce((s, p) => s + planTotals(p).due, 0))} icon="receipt" tone="tone-red" /></div>
        <Chips className="mb-16" value={st} onChange={setSt} options={[['actifs', 'En cours de traitement'], ...PLAN_ORDER.map(s => [s, PLAN_ST[s][0]]), ['tous', 'Tous']]} />
        <div className="grid g3">{list.map(pl => <Link key={pl.id} className="card hover" to={`/app/plans/${pl.id}`} style={{ color: 'inherit' }}><div className="card-body"><div className="row between"><div className="row"><Avatar p={pl.patient} size="sm" /><div><b>{pname(pl.patient)}</b><div className="xs muted">{pl.title}</div></div></div><MapBadge map={PLAN_ST} value={pl.status} /></div><div className="mt-16"><PlanSummary plan={pl} /></div></div></Link>)}
          {!list.length && <div className="card" style={{ gridColumn: '1/-1' }}><Empty text="Aucun plan" icon="clipboard" /></div>}</div>
      </>; }}</Async>
    {open && <NewPlan onClose={() => setOpen(false)} />}
  </>;
}
function NewPlan({ onClose }) {
  const act = useAction(); const run = useRun(); const nav = useNavigate(); const [pid, setPid] = useState(''); const [title, setTitle] = useState('');
  return <Modal title="Nouveau plan de traitement" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" disabled={!pid} onClick={() => run(() => act(() => post('/plans', { patientId: pid, title: title || 'Plan de traitement' })), 'Plan créé', 'clipboard').then(pl => nav(`/app/plans/${pl.id}`)).catch(() => { })}>Créer</button></>}>
    <div className="col" style={{ gap: 14 }}><Field label="Patient"><PatientPicker value={pid} onChange={setPid} autoFocus /></Field><Field label="Intitulé"><input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex. : Réhabilitation prothétique" /></Field></div>
  </Modal>;
}

export function PlanPage() {
  const { id } = useParams(); const q = useGet(`/plans/${id}`);
  return <Async q={q}>{pl => <><div className="crumbs"><Link to="/app/plans">Plans de traitement</Link> › {pname(pl.patient)}</div><PageHead title={pl.title} sub="Plan de traitement" /><PlanEditor plan={pl} /></>}</Async>;
}
