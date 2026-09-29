import { useState } from 'react';
import { post, useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { Async, Avatar, Card, Chips, Icon, Kpi, PageHead, useRun } from '../ui';
import { HBars, LineChart } from '../ui/charts';
import { fmt, sname } from '../lib/format';

const Stars = ({ n }) => <span style={{ color: 'var(--gold)', letterSpacing: 1 }}>{'★'.repeat(n)}<span style={{ color: 'var(--line-2)' }}>{'★'.repeat(5 - n)}</span></span>;

export default function Reviews() {
  const { can, staff } = useAuth(); const run = useRun(); const q = useGet('/reviews'); const [f, setF] = useState('all');
  return <Async q={q}>{d => { const list = d.comments.filter(r => f === 'all' || r.rating === +f);
    return <>
      <PageHead title="Avis & satisfaction" sub="Enquête envoyée automatiquement après chaque consultation" actions={can('comm.send') && <button className="btn primary" onClick={() => run(() => post('/reviews/request'), r => `Demande d’avis envoyée à ${r.sent} patient(s)`, 'star').catch(() => { })}><Icon name="send" />Demander un avis ({d.todayDone} patients du jour)</button>} />
      <div className="grid g4 mb-16"><Kpi className="premium" label="Satisfaction moyenne" value={<>{fmt.dec(d.avg, 2)}<small>/ 5</small></>} icon="star" tone="tone-gold" foot={<Stars n={Math.round(d.avg)} />} /><Kpi label="Nombre d’avis" value={d.count} icon="message" tone="tone-blue" foot={<span>6 derniers mois</span>} /><Kpi label="Avis 5 étoiles" value={d.five + ' %'} icon="heart" tone="tone-red" /><Kpi label="Taux de réponse" value="41 %" icon="activity" tone="tone-sage" foot={<span>des demandes envoyées</span>} /></div>
      <div className="grid g-3-2 mb-16">
        <Card title="Évolution de la satisfaction"><LineChart labels={d.evolution.map(e => fmt.mshort(e.m + '-01'))} series={[{ name: 'Note moyenne', data: d.evolution.map(e => e.avg), color: '#B89457' }]} height={210} fmtV={v => fmt.dec(v, 2) + ' / 5'} min0={false} /><div className="row between wrap small muted mt-8">{d.evolution.map(e => <span key={e.m}>{fmt.mshort(e.m + '-01')} : {e.n} avis</span>)}</div></Card>
        <Card title="Répartition des notes"><HBars rows={d.distribution.map(x => ({ label: `${x.n} étoile${x.n > 1 ? 's' : ''}`, value: x.count, color: x.n >= 4 ? 'var(--gold)' : x.n === 3 ? 'var(--warning)' : 'var(--danger)' }))} /><div className="divider" /><div className="xs muted mb-8">Par praticien</div>
          {d.byDentist.map(x => <div key={x.id} className="row between small" style={{ padding: '4px 0' }}><span>{x.name}</span><span><Stars n={Math.round(x.avg)} /> <b className="mono">{fmt.dec(x.avg)}</b> <span className="muted">({x.n})</span></span></div>)}</Card>
      </div>
      <div className="grid g-2-1">
        <Card title="Commentaires" actions={<Chips value={f} onChange={setF} options={[['all', 'Tous'], ['5', '5★'], ['4', '4★'], ['3', '3★']]} />}><div className="list">{list.map(r => <div key={r.id} className="li" style={{ alignItems: 'flex-start' }}><Avatar p={r.patient} size="sm" /><div className="grow"><div className="row between"><b style={{ fontSize: 13 }}>{r.patient.first} {r.patient.last[0]}.</b><span className="xs muted">{fmt.date(r.date)}</span></div><Stars n={r.rating} /><p className="small mt-4" style={{ color: 'var(--ink-2)' }}>{r.comment}</p><div className="xs muted">{sname(staff(r.dentistId))}</div></div></div>)}</div></Card>
        <Card title="Aperçu de l’enquête"><div style={{ border: '1px solid var(--line)', borderRadius: 16, padding: 20, textAlign: 'center', background: 'linear-gradient(180deg,#fff,var(--surface-2))' }}><div className="brand-mark" style={{ margin: '0 auto 10px' }}><Icon name="tooth" /></div><b className="serif" style={{ fontSize: 19, color: 'var(--navy)' }}>Comment s’est passée votre expérience ?</b><p className="small muted mt-8">Votre avis nous aide à améliorer nos soins.</p><div style={{ fontSize: 30, color: 'var(--gold)', margin: '12px 0', letterSpacing: 4 }}>★★★★★</div><div className="input" style={{ height: 60, textAlign: 'left', paddingTop: 8, color: 'var(--faint)' }}>Un commentaire (facultatif)…</div><button className="btn primary mt-12" style={{ width: '100%' }}>Envoyer mon avis</button></div><p className="xs muted mt-12">Envoyé 2h après le rendez-vous (règle « Message après rendez-vous »).</p></Card>
      </div>
    </>; }}</Async>;
}
