import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { patch, useAction, useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { useActions } from '../components/Modals';
import { Avatar, Chips, Icon, Loading, PageHead, Segmented, STATUS, useRun, cx } from '../ui';
import { D, fmt, sname, MSHORT } from '../lib/format';

const START = 8 * 60, END = 19 * 60, SLOT = 15, PX = 12;
const topOf = t => ((D.min(t) - START) / SLOT) * PX;
const isOff = (date, m) => { const dow = D.parse(date).getDay(); return (m >= D.min('12:30') && m < D.min('14:00')) || dow === 0 || (dow === 6 && m >= D.min('13:00')) || m < D.min('08:30') || m >= D.min('18:30'); };

export default function Agenda() {
  const { dentists, types, can, meta, clinic, me } = useAuth(); const actions = useActions(); const act = useAction(); const run = useRun();
  const [sp] = useSearchParams();
  const [view, setView] = useState('jour'); const [date, setDate] = useState(sp.get('date') || D.today()); const [dentist, setDentist] = useState(null); const [hidden, setHidden] = useState({}); const [showCancel, setShowCancel] = useState(true);
  const dn = dentist && dentists.find(d => d.id === dentist) ? dentist : null; const dnOrFirst = dn || (dentists[0] && dentists[0].id);
  const range = useMemo(() => {
    if (view === 'semaine') { const m = D.monday(date); return [m, D.add(m, 5)]; }
    if (view === 'mois') { const d = D.parse(date); const first = D.ymd(new Date(d.getFullYear(), d.getMonth(), 1)); const s = D.monday(first); return [s, D.add(s, 41)]; }
    return [date, date];
  }, [view, date]);
  const q = useGet('/appointments', { from: range[0], to: range[1] });
  const all = (q.data || []).filter(a => showCancel || a.status !== 'annule');
  const ag = useRef(null);
  useEffect(() => { if (ag.current) ag.current.scrollTop = Math.max(0, ((Math.min(D.nowMin(), 17 * 60) - START - 60) / SLOT) * PX); }, [view, q.isSuccess]);

  const clinics = clinic === 'all' ? meta.clinics.filter(c => me.allowedClinics.includes(c.id)) : meta.clinics.filter(c => c.id === clinic);
  let cols = [];
  if (view === 'fauteuil') cols = clinics.flatMap(c => c.chairs.map(ch => ({ key: c.id + '|' + ch, label: ch, sub: c.name, date, match: a => a.clinicId === c.id && a.chair === ch && a.date === date, target: { chair: ch, dentistId: (meta.staff.find(s => s.role === 'dentiste' && s.clinicId === c.id && s.chair === ch) || meta.staff.find(s => s.role === 'dentiste' && s.clinicId === c.id) || {}).id } })));
  else if (view === 'semaine') cols = Array.from({ length: 6 }, (_, i) => { const y = D.add(D.monday(date), i); return { key: y, label: `${fmt.dow(y)} ${D.parse(y).getDate()}`, sub: MSHORT[D.parse(y).getMonth()], date: y, today: y === D.today(), match: a => a.dentistId === dnOrFirst && a.date === y, target: { dentistId: dnOrFirst } }; });
  else if (view === 'dentiste') { const d = meta.staff.find(s => s.id === dnOrFirst); cols = d ? [{ key: d.id, label: sname(d), sub: d.spec, date, match: a => a.dentistId === d.id && a.date === date, target: { dentistId: d.id } }] : []; }
  else cols = dentists.filter(d => !hidden[d.id]).map(d => ({ key: d.id, label: sname(d), sub: d.spec, color: d.color, date, match: a => a.dentistId === d.id && a.date === date, target: { dentistId: d.id } }));

  const nav = dir => { if (view === 'mois') { const d = D.parse(date); d.setMonth(d.getMonth() + dir); setDate(D.ymd(d)); } else { let d = D.add(date, (view === 'semaine' ? 7 : 1) * dir); if (view !== 'semaine' && D.parse(d).getDay() === 0) d = D.add(d, dir); setDate(d); } };
  const label = view === 'mois' ? fmt.month(date).replace(/^./, c => c.toUpperCase()) : view === 'semaine' ? `Semaine du ${fmt.dayMonth(D.monday(date))} au ${fmt.date(D.add(D.monday(date), 5))}` : fmt.dateLongCap(date);
  const drop = (a, col, t) => {
    if (!a || (a.date === col.date && a.start === t && (!col.target.dentistId || col.target.dentistId === a.dentistId))) return;
    run(() => act(() => patch(`/appointments/${a.id}`, { date: col.date, start: t, ...(col.target.dentistId && col.target.dentistId !== a.dentistId ? { dentistId: col.target.dentistId } : {}), ...(col.target.chair ? { chair: col.target.chair } : {}) })), `${a.patient.first} ${a.patient.last} déplacé à ${t} · patient notifié`, 'repeat').catch(() => { });
  };
  const needDn = ['semaine', 'dentiste', 'mois'].includes(view);

  return <>
    <PageHead title="Agenda" sub="Glissez-déposez un rendez-vous pour le déplacer · cliquez sur un créneau libre pour en créer un" actions={can('agenda.manage') && <button className="btn primary" onClick={() => actions.newAppt({ date })}><Icon name="plus" />Nouveau rendez-vous</button>} />
    <div className="card mb-16">
      <div className="card-body row wrap between" style={{ gap: 12, padding: '12px 16px' }}>
        <div className="row"><button className="btn icon sm" onClick={() => nav(-1)} aria-label="Précédent"><Icon name="chevronLeft" /></button><button className="btn sm" onClick={() => setDate(D.today())}>Aujourd’hui</button><button className="btn icon sm" onClick={() => nav(1)} aria-label="Suivant"><Icon name="chevronRight" /></button><input type="date" className="input sm" style={{ width: 150 }} value={date} onChange={e => e.target.value && setDate(e.target.value)} /><b style={{ marginLeft: 6, fontSize: 15 }}>{label}</b></div>
        <Segmented value={view} onChange={setView} options={[['jour', 'Jour'], ['semaine', 'Semaine'], ['mois', 'Mois'], ['dentiste', 'Praticien'], ['fauteuil', 'Fauteuil']]} />
      </div>
      <div className="row wrap between" style={{ padding: '0 16px 12px', gap: 10 }}>
        {needDn ? <Chips value={view === 'mois' ? dentist || 'all' : dnOrFirst} onChange={k => setDentist(k === 'all' ? null : k)} options={[...(view === 'mois' ? [['all', 'Tous']] : []), ...dentists.map(d => [d.id, `${d.title} ${d.last}`, d.color])]} />
          : view === 'jour' ? <div className="chips">{dentists.map(d => <button key={d.id} className={cx('chip', !hidden[d.id] && 'on')} onClick={() => setHidden(h => ({ ...h, [d.id]: !h[d.id] }))}><i className="sw" style={{ background: d.color }} />{d.title} {d.last}</button>)}</div> : <span />}
        <label className="check small"><input type="checkbox" checked={showCancel} onChange={e => setShowCancel(e.target.checked)} /> Afficher les annulés</label>
      </div>
    </div>
    {q.isLoading ? <Loading /> : view === 'mois' ? <Month date={date} list={all.filter(a => a.status !== 'annule' && (!dentist || a.dentistId === dentist))} types={types} onDay={d => { setDate(d); setView('jour'); }} />
      : view === 'dentiste' ? <div className="grid agd" style={{ gridTemplateColumns: 'minmax(0,1fr) 340px', alignItems: 'start' }}><Grid agRef={ag} cols={cols} list={all} types={types} onDrop={drop} onSlot={(col, t) => actions.newAppt({ date: col.date, start: t, ...col.target })} onAppt={id => actions.appt(id)} canM={can('agenda.manage')} wide /><Side dnId={dnOrFirst} date={date} list={q.data || []} types={types} /><style>{'@media (max-width:1000px){.agd{grid-template-columns:1fr!important}}'}</style></div>
        : <Grid agRef={ag} cols={cols} list={all} types={types} onDrop={drop} onSlot={(col, t) => actions.newAppt({ date: col.date, start: t, ...col.target })} onAppt={id => actions.appt(id)} canM={can('agenda.manage')} />}
    <div className="row wrap between mt-16" style={{ gap: 12 }}><div className="type-legend">{Object.values(types).map(t => <span key={t.label}><i style={{ background: t.color }} />{t.label}</span>)}</div><div className="type-legend">{Object.values(STATUS).map(s => <span key={s[0]}><i style={{ background: s[2], borderRadius: '50%' }} />{s[0]}</span>)}</div></div>
  </>;
}

function Grid({ agRef, cols, list, types, onDrop, onSlot, onAppt, canM, wide }) {
  const [drag, setDrag] = useState(null); const [over, setOver] = useState(null); const now = D.nowMin();
  const hours = []; for (let m = START; m < END; m += 60) hours.push(m);
  const slots = []; for (let m = START; m < END; m += SLOT) slots.push(m);
  return <div className="agenda" ref={agRef} style={{ gridTemplateColumns: `60px repeat(${cols.length}, ${wide ? 'minmax(300px,1fr)' : 'minmax(150px,1fr)'})` }}>
    <div className="ag-head corner" />
    {cols.map(c => <div key={c.key} className={cx('ag-head', c.today && 'today')}>{c.color && <span className="avatar xs" style={{ background: c.color }}>{c.label.split(' ').slice(-1)[0][0]}</span>}<div style={{ minWidth: 0 }}><div className="truncate">{c.label}</div><small className="truncate">{c.sub} · {list.filter(a => c.match(a) && a.status !== 'annule').length} RDV</small></div></div>)}
    <div className="ag-times">{hours.map(m => <div key={m} className="ag-time">{D.hm(m)}</div>)}</div>
    {cols.map(c => {
      const ap = list.filter(c.match).sort((a, b) => a.start.localeCompare(b.start)); const lanes = [];
      const placed = ap.map(a => { const s = D.min(a.start); let l = lanes.findIndex(e => e <= s); if (l < 0) { l = lanes.length; lanes.push(0); } lanes[l] = s + a.dur; return { a, l }; });
      const nL = Math.max(1, lanes.length); const w = 100 / nL;
      return <div key={c.key} className="ag-col">
        {slots.map(m => { const t = D.hm(m); const off = isOff(c.date, m); return <div key={m} className={cx('ag-slot', off && 'off', over === c.key + t && 'drop')}
          onClick={() => canM && !off && onSlot(c, t)} onDragOver={e => { if (drag && !off) { e.preventDefault(); setOver(c.key + t); } }} onDrop={e => { e.preventDefault(); setOver(null); if (!off) onDrop(drag, c, t); setDrag(null); }} />; })}
        {placed.map(({ a, l }) => { const t = types[a.type]; const h = Math.max(20, (a.dur / SLOT) * PX - 3); const dr = canM && !['termine', 'annule'].includes(a.status);
          return <div key={a.id} className={cx('appt', a.status === 'annule' && 'st-annule', a.status === 'noshow' && 'noshow', drag && drag.id === a.id && 'dragging')} draggable={dr}
            onDragStart={e => { setDrag(a); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', a.id); }} onDragEnd={() => { setDrag(null); setOver(null); }} onClick={e => { e.stopPropagation(); onAppt(a.id); }}
            style={{ top: topOf(a.start) + 1, height: h, left: `calc(${l * w}% + 3px)`, right: 'auto', width: `calc(${w}% - 6px)`, background: t.color + '14', borderLeftColor: t.color, color: 'var(--ink)' }} title={`${a.patient.first} ${a.patient.last} — ${t.label} ${a.start}`}>
            <span className="ico-st" style={{ background: STATUS[a.status][2] }} />
            <b>{a.patient.first[0]}. {a.patient.last}{a.patient.allergies.length > 0 && <span style={{ color: 'var(--danger)' }}> ●</span>}</b>{h > 30 && <div className="at">{a.start} · {t.label}</div>}{h > 52 && a.note && <div className="at truncate">{a.note}</div>}
          </div>; })}
        {c.date === D.today() && now > START && now < END && <div className="now-indicator" style={{ top: ((now - START) / SLOT) * PX }} />}
      </div>;
    })}
  </div>;
}

function Month({ date, list, types, onDay }) {
  const d0 = D.parse(date); const start = D.monday(D.ymd(new Date(d0.getFullYear(), d0.getMonth(), 1))); const cells = [];
  for (let i = 0; i < 42; i++) { const y = D.add(start, i); const d = D.parse(y); if (i === 35 && d.getMonth() !== d0.getMonth()) break; cells.push(y); }
  return <div className="month">{['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(x => <div key={x} className="mh">{x}</div>)}
    {cells.map(y => { const ap = list.filter(a => a.date === y).sort((a, b) => a.start.localeCompare(b.start)); const d = D.parse(y);
      return <div key={y} className={cx('md', d.getMonth() !== d0.getMonth() && 'other', y === D.today() && 'today')} onClick={() => onDay(y)}><div className="row between"><span className="dn">{d.getDate()}</span>{ap.length > 0 && <span className="xs muted">{ap.length} RDV</span>}</div>
        {ap.slice(0, 3).map(a => <div key={a.id} className="m-ev" style={{ background: types[a.type].color + '14', borderLeftColor: types[a.type].color }}>{a.start} {a.patient.last}</div>)}{ap.length > 3 && <div className="xs muted mt-4">+ {ap.length - 3} autres</div>}</div>; })}
  </div>;
}

function Side({ dnId, date, list, types }) {
  const { staff, clinicById } = useAuth(); const actions = useActions(); const d = staff(dnId);
  const free = useGet('/appointments/slots', { dentist: dnId, date, dur: 30 });
  if (!d) return null;
  const day = list.filter(a => a.dentistId === dnId && a.date === date); const busy = day.filter(a => a.status !== 'annule').reduce((s, a) => s + a.dur, 0); const avail = D.parse(date).getDay() === 6 ? 270 : 510;
  const rev = day.filter(a => a.status === 'termine').reduce((s, a) => s + types[a.type].price, 0);
  return <div className="card"><div className="card-body"><div className="row"><Avatar p={d} size="lg" /><div><b style={{ fontSize: 16 }}>{sname(d)}</b><div className="small muted">{d.spec}</div><div className="xs muted">{clinicById(d.clinicId).name} · {d.chair}</div></div></div>
    <div className="grid g2 mt-16" style={{ gap: 10 }}>{[['RDV du jour', day.filter(a => a.status !== 'annule').length], ['Taux de remplissage', Math.min(100, Math.round((busy / avail) * 100)) + ' %'], ['CA réalisé (jour)', fmt.money(rev)], ['No-show (jour)', day.filter(a => a.status === 'noshow').length]].map(([l, v]) => <div key={l} style={{ padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 10 }}><div className="xs muted">{l}</div><b className="mono">{v}</b></div>)}</div>
    <div className="divider" /><div className="xs muted mb-8">Créneaux libres</div>
    <div className="chips">{(free.data || []).slice(0, 12).map(t => <button key={t} className="chip" onClick={() => actions.newAppt({ date, start: t, dentistId: dnId })}>{t}</button>)}{free.data && !free.data.length && <span className="small muted">Complet</span>}</div>
  </div></div>;
}
