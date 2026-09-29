import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { post, useAction, useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { useActions } from '../components/Modals';
import { Async, Badge, Chips, Delta, Empty, Icon, Kpi, MapBadge, PageHead, StatusBadge, Progress, useRun, cx } from '../ui';
import { BarChart, Donut, Spark } from '../ui/charts';
import { D, fmt, pname, sname, LAB_ST } from '../lib/format';

export default function Dashboard() {
  const { me, clinic, clinicById, dentists, types, can } = useAuth(); const actions = useActions();
  const [dentist, setDentist] = useState('all');
  const q = useGet('/dashboard', { dentist });
  const hour = new Date().getHours();
  const greet = (hour < 18 ? 'Bonjour' : 'Bonsoir') + ', ' + (me.user.title ? `${me.user.title} ${me.user.last}` : me.user.first);
  return <>
    <PageHead title={greet} sub={`${fmt.dateLongCap(D.today())} · ${clinic === 'all' ? 'Vue consolidée — tous les cabinets' : (clinicById(clinic) || {}).name}`}
      actions={<>{can('patients.edit') && <button className="btn" onClick={() => actions.newPatient()}><Icon name="user" />Nouveau patient</button>}{can('agenda.manage') && <button className="btn primary" onClick={() => actions.newAppt()}><Icon name="plus" />Nouveau rendez-vous</button>}</>} />
    <Async q={q}>{d => <Content d={d} dentist={dentist} setDentist={setDentist} dentists={dentists} types={types} clinic={clinic} />}</Async>
  </>;
}

function Content({ d, dentist, setDentist, dentists, types, clinic }) {
  const { stats: s, history: h } = d; const rev = h.map(x => x.revenue); const prev = h.length > 1 ? h[h.length - 2].revenue : 0;
  const mixTotal = d.mix.reduce((a, m) => a + +m.n, 0);
  return <>
    <div className="grid g4">
      <Kpi label="Rendez-vous aujourd’hui" value={s.todayActive} icon="calendar" tone="tone-blue" foot={<span>{s.todayDone} terminés · {s.todayWaiting} en attente</span>} />
      <Kpi label="Patients du jour" value={s.patientsToday} icon="users" tone="tone-sage" foot={<span>{s.inChair} en fauteuil actuellement</span>} />
      <Kpi label="Nouveaux patients" value={s.newPatients} icon="user" tone="tone-teal" foot={<span>ce mois-ci</span>} spark={<Spark data={h.map(x => x.newPatients)} color="#3AA6A0" />} />
      <Kpi label="Traitements en cours" value={s.plansActive} icon="clipboard" tone="tone-violet" foot={<span>plans actifs</span>} />
      <Kpi label="Rendez-vous à venir" value={s.upcoming} icon="clock" tone="tone-navy" foot={<span>7 prochains jours</span>} />
      <Kpi label="Paiements du jour" value={<>{fmt.num(s.payToday)}<small>DH</small></>} icon="wallet" tone="tone-green" foot={<span>encaissés aujourd’hui</span>} />
      <Kpi label="Factures impayées" value={s.unpaidN} icon="receipt" tone="tone-red" foot={<span>{fmt.money(s.unpaidAmt)} à encaisser</span>} />
      <Kpi className="premium" label="Revenus du mois" value={<>{fmt.num(s.revenueMonth)}<small>DH</small></>} icon="trend" tone="tone-gold" spark={<Spark data={rev} color="#B89457" />} foot={<><span>vs {fmt.k(prev)} DH mois dernier</span>{prev > 0 && <Delta v={(s.revenueMonth / prev - 1) * 100} />}</>} />
    </div>
    <div className="grid g-2-1 mt-16">
      <div className="card">
        <div className="card-head"><div><h3>Planning du jour</h3><div className="sub">{s.todayActive} rendez-vous · {d.today.filter(a => a.status === 'noshow').length} no-show · {d.today.filter(a => a.status === 'annule').length} annulé(s)</div></div><Link className="btn sm" to="/app/agenda"><Icon name="calendar" />Agenda</Link></div>
        <div className="card-body" style={{ paddingTop: 12 }}>
          {dentists.length > 1 && <Chips className="mb-12" value={dentist} onChange={setDentist} options={[['all', 'Tous les praticiens'], ...dentists.map(x => [x.id, `${x.title} ${x.last}`, x.color])]} />}
          <div className="sched" style={{ maxHeight: 560, overflow: 'auto', margin: '0 -8px' }}><Schedule list={d.today} types={types} /></div>
        </div>
      </div>
      <div className="col gap-16">
        <div className="card"><div className="card-head"><h3>Alertes</h3><Badge label={d.alerts.length} cls="tone-red" dot={false} /></div>
          <div className="card-body col" style={{ gap: 8 }}>{d.alerts.map((a, i) => <Link key={i} className="alert-item" to={'/app' + a.href} style={{ color: 'inherit' }}><div className={cx('ico', a.tone)}><Icon name={a.icon} /></div><div style={{ minWidth: 0 }}><b>{a.title}</b><span className="truncate" style={{ display: 'block' }}>{a.sub}</span></div></Link>)}{!d.alerts.length && <Empty text="Aucune alerte" icon="check" />}</div></div>
        <div className="card"><div className="card-head"><h3>Laboratoire</h3><Link className="small" to="/app/laboratoire">Tout voir</Link></div>
          <div className="card-body"><div className="list">{d.lab.map(l => <div key={l.id} className="li"><div className="avatar sm" style={{ background: 'var(--gold-50)', color: 'var(--gold)' }}><Icon name="flask" size={14} /></div><div className="grow" style={{ minWidth: 0 }}><div className="t truncate">{l.type} · {l.teeth}</div><div className="s truncate">{pname(l.patient)} · retour {fmt.rel(l.due)}</div></div><MapBadge map={LAB_ST} value={l.status} /></div>)}</div></div></div>
      </div>
    </div>
    <div className="grid g-3-2 mt-16">
      <div className="card"><div className="card-head"><div><h3>Chiffre d’affaires</h3><div className="sub">12 derniers mois</div></div><Link className="btn sm" to="/app/analytics"><Icon name="chart" />Analytics</Link></div>
        <div className="card-body"><BarChart labels={h.map(x => fmt.mshort(x.m))} series={[{ name: 'Chiffre d’affaires', data: rev, color: '#2C6BCB' }]} height={230} fmtV={fmt.money} /></div></div>
      <div className="card"><div className="card-head"><div><h3>Activité du mois par type</h3><div className="sub">{mixTotal} rendez-vous</div></div></div>
        <div className="card-body"><Donut data={d.mix.sort((a, b) => b.n - a.n).slice(0, 6).map(m => ({ label: types[m.type].label, value: +m.n, color: types[m.type].color }))} center={mixTotal} sub="RDV" /></div></div>
    </div>
    {d.sites && <div className="card mt-16"><div className="card-head"><div><h3>Vue direction — comparatif des établissements</h3><div className="sub">Données isolées par cabinet, consolidées pour la direction</div></div></div>
      <div className="table-wrap" style={{ paddingTop: 10 }}><table className="table"><thead><tr><th>Établissement</th><th className="num">RDV aujourd’hui</th><th className="num">CA du mois</th><th>Taux de remplissage</th><th className="num">No-show</th><th className="num">Satisfaction</th><th className="num">Encours impayés</th></tr></thead>
        <tbody>{d.sites.map(c => <tr key={c.id}><td><div className="row"><span className="clinic-dot"><Icon name="building" /></span><div><b>{c.name}</b><div className="xs muted">{c.dentists} praticien(s) · {c.chairs} fauteuils</div></div></div></td><td className="num">{c.today}</td><td className="num">{fmt.money(c.revenue)}</td><td style={{ minWidth: 140 }}><div className="row"><div className="grow"><Progress value={c.fill} /></div><span className="small mono">{c.fill} %</span></div></td><td className="num">{fmt.pct(c.noshow)}</td><td className="num">★ {fmt.dec(c.rating)}</td><td className="num">{fmt.money(c.unpaid)}</td></tr>)}</tbody></table></div></div>}
  </>;
}

function Schedule({ list, types }) {
  const { can, staff } = useAuth(); const actions = useActions(); const act = useAction(); const run = useRun();
  const now = D.nowMin(); let shown = false;
  if (!list.length) return <Empty text="Aucun rendez-vous aujourd’hui" icon="calendar" />;
  const quick = (e, a, s) => { e.stopPropagation(); run(() => act(() => post(`/appointments/${a.id}/status`, { status: s })), r => (r.invoice ? `Séance terminée · facture ${r.invoice.number}` : 'Statut mis à jour')).catch(() => { }); };
  return list.map(a => {
    const t = types[a.type]; const st = D.min(a.start), en = st + a.dur; const p = a.patient;
    let line = null; if (!shown && st > now) { shown = true; line = <div className="now-line">MAINTENANT · {D.hm(now)}</div>; }
    const q = !can('agenda.manage') ? null : a.status === 'attente' ? ['confirme', 'check', 'Confirmer', ''] : a.status === 'confirme' && st - now < 30 && st - now > -60 ? ['encours', 'activity', 'Démarrer', ''] : a.status === 'encours' ? ['termine', 'check', 'Terminer', 'success'] : null;
    return <Fragment key={a.id}>{line}
      <div className={cx('sched-item', a.status === 'encours' && 'now', en < now && a.status !== 'encours' && 'past')} onClick={() => actions.appt(a.id)}>
        <div className="time">{a.start}<span>{a.dur} min</span></div><div className="bar" style={{ background: t.color }} />
        <div style={{ minWidth: 0 }}><div className="row gap-6" style={{ fontWeight: 600 }}><span className="truncate">{t.label}</span><span className="faint" style={{ fontWeight: 400 }}>—</span><span className="truncate" style={{ fontWeight: 500 }}>{pname(p)}</span>{p.allergies.length > 0 && <span className="tag allergy" title={'Allergies : ' + p.allergies.join(', ')}>!</span>}</div>
          <div className="xs muted truncate">{sname(staff(a.dentistId))} · {a.chair}{a.note ? ' · ' + a.note : ''}</div></div>
        <div className="row gap-6">{q && <button className={cx('btn xs', q[3])} onClick={e => quick(e, a, q[0])}><Icon name={q[1]} />{q[2]}</button>}<StatusBadge status={a.status} /></div>
      </div></Fragment>;
  });
}
