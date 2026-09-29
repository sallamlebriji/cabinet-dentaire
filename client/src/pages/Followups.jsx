import { useState } from 'react';
import { Link } from 'react-router-dom';
import { patch, post, useAction, useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { useActions } from '../components/Modals';
import { Async, Avatar, Badge, Card, Chips, Empty, Icon, Kpi, PageHead, Switch, Tabs, useRun } from '../ui';
import { BarChart, LineChart } from '../ui/charts';
import { D, fmt, pname } from '../lib/format';

const TC = { 'Contrôle 6 mois': 'tone-blue', 'Détartrage recommandé': 'tone-teal', 'Contrôle orthodontique': 'tone-violet', 'Suivi après traitement': 'tone-sage', 'Relance devis': 'tone-gold', 'Relance paiement': 'tone-red', 'Relance plan de traitement': 'tone-amber' };

export default function Followups() {
  const [tab, setTab] = useState('taches');
  return <>
    <PageHead title="Suivis" sub="Rappels intelligents et gestion des absences" actions={tab === 'taches' && <GenBtn />} />
    <div className="mb-16"><Tabs value={tab} onChange={setTab} tabs={[{ key: 'taches', label: 'Rappels de suivi' }, { key: 'noshow', label: 'Absences & no-show' }]} /></div>
    {tab === 'noshow' ? <NoShow /> : <Tasks />}
  </>;
}
function GenBtn() { const act = useAction(); const run = useRun(); return <button className="btn gold" onClick={() => run(() => act(() => post('/followups/generate')), r => (r.created ? `${r.created} nouvelle(s) tâche(s) de suivi créée(s)` : 'Aucun nouveau suivi nécessaire'), 'sparkles').catch(() => { })}><Icon name="sparkles" />Analyser & générer les suivis</button>; }

function Tasks() {
  const { can } = useAuth(); const actions = useActions(); const act = useAction(); const run = useRun(); const q = useGet('/followups'); const [f, setF] = useState('ouverts'); const t = D.today();
  return <Async q={q}>{all => { const list = f === 'ouverts' ? all.filter(x => x.status !== 'fait') : f === 'retard' ? all.filter(x => x.status !== 'fait' && x.due < t) : f === 'auto' ? all.filter(x => x.auto) : all.filter(x => x.status === 'fait');
    return <>
      <div className="grid g4 mb-16"><Kpi label="À faire" value={all.filter(x => x.status !== 'fait').length} icon="repeat" tone="tone-blue" /><Kpi label="En retard" value={all.filter(x => x.status !== 'fait' && x.due < t).length} icon="alert" tone="tone-red" /><Kpi label="Cette semaine" value={all.filter(x => x.status !== 'fait' && x.due >= t && x.due <= D.add(t, 7)).length} icon="calendar" tone="tone-amber" /><Kpi label="Générés automatiquement" value={all.filter(x => x.auto).length} icon="zap" tone="tone-gold" /></div>
      <div className="card"><div className="card-body"><Chips value={f} onChange={setF} options={[['ouverts', 'Ouverts'], ['retard', 'En retard'], ['auto', 'Automatiques'], ['faits', 'Terminés']]} /></div>
        <div className="table-wrap"><table className="table responsive"><thead><tr><th>Patient</th><th>Suivi</th><th>Échéance</th><th>Note</th><th>Statut</th><th /></tr></thead>
          <tbody>{list.map(x => <tr key={x.id}><td data-l="Patient"><Link to={`/app/patients/${x.patientId}`} className="row" style={{ color: 'inherit' }}><Avatar p={x.patient} size="sm" /><div><div style={{ fontWeight: 500 }}>{pname(x.patient)}</div><div className="xs muted">{x.patient.phone}</div></div></Link></td>
            <td data-l="Suivi"><Badge label={x.type} cls={TC[x.type] || 'tone-gray'} dot={false} />{x.auto && <span title="Généré automatiquement" style={{ color: 'var(--gold)' }}> <Icon name="zap" size={12} style={{ display: 'inline' }} /></span>}</td>
            <td data-l="Échéance" style={x.due < t && x.status !== 'fait' ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>{fmt.rel(x.due)}</td><td data-l="Note" className="small muted">{x.note}</td>
            <td data-l="Statut">{x.status === 'fait' ? <Badge label="Fait" cls="st-termine" /> : x.status === 'relance' ? <Badge label="Relancé" cls="st-attente" /> : <Badge label="À faire" cls="st-confirme" />}</td>
            <td>{x.status !== 'fait' && <div className="row gap-4">{can('agenda.manage') && <button className="btn xs" onClick={() => actions.newAppt({ patientId: x.patientId, dentistId: x.patient.dentistId, type: /ortho/i.test(x.type) ? 'orthodontie' : /Détartrage/.test(x.type) ? 'detartrage' : 'controle', date: x.due < t ? D.add(t, 1) : x.due, note: x.type })}><Icon name="calendar" />Planifier</button>}
              {can('comm.send') && <button className="btn xs" onClick={() => run(() => act(() => post(`/followups/${x.id}/remind`)), `Rappel de suivi envoyé à ${x.patient.first}`, 'send').catch(() => { })}><Icon name="send" />Rappel</button>}
              <button className="btn xs" title="Marquer comme fait" onClick={() => run(() => act(() => patch(`/followups/${x.id}`, { status: 'fait' })), 'Suivi marqué comme fait').catch(() => { })}><Icon name="check" /></button></div>}</td></tr>)}
            {!list.length && <tr><td colSpan={6}><Empty text="Aucun suivi" icon="repeat" /></td></tr>}</tbody></table></div></div>
    </>; }}</Async>;
}

function NoShow() {
  const { can } = useAuth(); const act = useAction(); const run = useRun(); const q = useGet('/noshow'); const dash = useGet('/dashboard');
  return <Async q={q}>{d => { const c = d.counts; const h = (dash.data && dash.data.history) || [];
    return <>
      <div className="grid g4 mb-16"><Kpi label="Rendez-vous annulés" value={c.annule} icon="x" tone="tone-gray" foot={<span>30 derniers jours</span>} /><Kpi label="Rendez-vous déplacés" value={c.moved} icon="repeat" tone="tone-violet" foot={<span>30 derniers jours</span>} /><Kpi label="No-show" value={c.noshow} icon="alert" tone="tone-red" foot={<span>taux {fmt.pct((c.noshow / (c.total || 1)) * 100)}</span>} /><Kpi label="Retards" value={c.late} icon="clock" tone="tone-amber" foot={<span>moy. {c.lateAvg} min</span>} /></div>
      <div className="grid g2 mb-16"><Card title="Taux de no-show — 12 mois">{h.length > 0 && <LineChart labels={h.map(x => fmt.mshort(x.m))} series={[{ name: 'No-show', data: h.map(x => x.noshow), color: '#CF4759' }]} height={200} fmtV={v => fmt.pct(v)} />}</Card>
        <Card title="No-show par jour de la semaine"><BarChart labels={['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']} series={[{ name: 'Taux de no-show', data: d.byDow, color: '#CF4759' }]} height={200} fmtV={v => fmt.pct(v)} /></Card></div>
      <Card title="Patients à risque (≥ 2 rendez-vous non honorés)" sub="Le rappel renforcé envoie 3 rappels (48h, 24h, 3h) et demande une confirmation" actions={can('comm.send') && <button className="btn primary sm" onClick={() => run(() => act(() => post('/noshow/reinforce-all')), r => `Rappel renforcé activé · ${r.sent} message(s) envoyé(s)`, 'zap').catch(() => { })}><Icon name="zap" />Activer pour tous & envoyer</button>} bodyClass="table-wrap">
        <table className="table responsive"><thead><tr><th>Patient</th><th className="num">No-show</th><th className="num">Retards</th><th>Prochain RDV</th><th>Rappel renforcé</th><th /></tr></thead>
          <tbody>{d.risky.map(p => <tr key={p.id}><td data-l="Patient"><Link to={`/app/patients/${p.id}`} className="row" style={{ color: 'inherit' }}><Avatar p={p} size="sm" /><div><div style={{ fontWeight: 500 }}>{pname(p)}</div><div className="xs muted">{p.phone}</div></div></Link></td><td data-l="No-show" className="num"><b style={{ color: 'var(--danger)' }}>{p.noShows}</b></td><td data-l="Retards" className="num">{p.lateCount}</td>
            <td data-l="Prochain RDV">{p.nextAppt ? `${fmt.rel(p.nextAppt.date)} · ${p.nextAppt.start}` : <span className="faint">—</span>}</td>
            <td data-l="Renforcé"><Switch checked={p.reinforced} disabled={!can('patients.edit')} onChange={v => run(() => act(() => patch(`/patients/${p.id}`, { reinforced: v })), `Rappel renforcé ${v ? 'activé' : 'désactivé'} pour ${p.first}`).catch(() => { })} /></td>
            <td>{p.nextAppt && can('comm.send') && <button className="btn xs" onClick={() => run(() => post(`/noshow/${p.id}/remind`), 'Rappel renforcé envoyé', 'send').catch(() => { })}><Icon name="send" />Envoyer maintenant</button>}</td></tr>)}
            {!d.risky.length && <tr><td colSpan={6}><Empty text="Aucun patient à risque" icon="check" /></td></tr>}</tbody></table></Card>
    </>; }}</Async>;
}
