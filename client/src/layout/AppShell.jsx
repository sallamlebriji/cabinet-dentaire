import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { get, post, useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { Avatar, Dropdown, ErrorBoundary, Icon, cx } from '../ui';
import { ActionsProvider, useActions } from '../components/Modals';
import Assistant from '../components/Assistant';
import { fmt, sname } from '../lib/format';

export const NAV = [
  ['Pilotage', [['', 'Dashboard', 'dashboard'], ['analytics', 'Analytics', 'chart', 'analytics.view']]],
  ['Patientèle', [['patients', 'Patients', 'users', 'patients.view'], ['agenda', 'Agenda', 'calendar', 'agenda.view'], ['consultations', 'Consultations', 'stethoscope', 'clinical.view'], ['odontogramme', 'Odontogramme', 'tooth', 'clinical.view'], ['plans', 'Plans de traitement', 'clipboard', 'patients.view'], ['orthodontie', 'Orthodontie', 'activity', 'clinical.view']]],
  ['Finance', [['devis', 'Devis', 'file', 'finance.view'], ['facturation', 'Facturation', 'receipt', 'finance.view'], ['paiements', 'Paiements', 'card', 'finance.view']]],
  ['Dossiers', [['documents', 'Documents', 'folder', 'patients.view'], ['radiographies', 'Radiographies', 'scan', 'clinical.view']]],
  ['Opérations', [['laboratoire', 'Laboratoire', 'flask', 'lab.manage'], ['stock', 'Stock', 'box', 'stock.manage'], ['fournisseurs', 'Fournisseurs', 'truck', 'stock.manage']]],
  ['Relation patient', [['communication', 'Communication', 'message', 'comm.send'], ['suivis', 'Suivis', 'repeat', 'agenda.view'], ['avis', 'Avis & satisfaction', 'star', 'patients.view']]],
  ['Administration', [['personnel', 'Personnel', 'badge', 'staff.manage'], ['parametres', 'Paramètres', 'settings', 'settings.manage']]]
];
const FLAT = NAV.flatMap(g => g[1]);
const ALERT_COUNTS = ['communication', 'stock', 'laboratoire', 'suivis'];
const NK = { lab: ['flask', 'tone-gold'], msg: ['message', 'tone-blue'], booking: ['calendar', 'tone-teal'], review: ['star', 'tone-gold'], pay: ['card', 'tone-green'], stock: ['box', 'tone-red'], alert: ['alert', 'tone-amber'] };

function Locked({ label }) {
  const { me, meta } = useAuth();
  return <div className="locked-view card card-pad"><div className="ico"><Icon name="lock" /></div><h2 className="serif" style={{ fontSize: 22, color: 'var(--navy)' }}>Accès restreint</h2><p className="muted mt-8">Le rôle <b>{meta.roles[me.user.role]}</b> n’a pas la permission d’accéder au module « {label} ». Les permissions sont définies par l’administrateur dans <b>Personnel → Rôles & permissions</b>.</p><div className="row mt-16" style={{ justifyContent: 'center' }}><Link className="btn" to="/app">Retour au dashboard</Link></div></div>;
}

function GlobalSearch() {
  const [q, setQ] = useState(''); const [focus, setFocus] = useState(0); const [open, setOpen] = useState(false); const nav = useNavigate(); const inp = useRef(null);
  const [dq, setDq] = useState(''); useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 200); return () => clearTimeout(t); }, [q]);
  const { can } = useAuth();
  const res = useGet('/patients', { q: dq, limit: 7 }, { enabled: !!dq && can('patients.view') });
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const mods = dq ? FLAT.filter(n => norm(n[1]).includes(norm(dq))).slice(0, 4) : [];
  const items = [...(res.data || []).map(p => ({ href: `/app/patients/${p.id}`, p })), ...mods.map(m => ({ href: '/app/' + m[0], m }))];
  useEffect(() => { const k = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inp.current.focus(); } }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, []);
  const go = it => { nav(it.href); setQ(''); setOpen(false); inp.current.blur(); };
  return <div className="search"><Icon name="search" />
    <input ref={inp} value={q} placeholder="Rechercher un patient, un dossier, un module…" aria-label="Recherche globale" autoComplete="off" onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onChange={e => { setQ(e.target.value); setFocus(0); }}
      onKeyDown={e => { if (!items.length) return; if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setFocus(f => (f + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length); } if (e.key === 'Enter') go(items[focus]); if (e.key === 'Escape') setQ(''); }} />
    <span className="kbd">Ctrl K</span>
    {open && dq && <div className="search-results">{items.length ? items.map((it, i) => <div key={it.href} className={cx('sr-item', i === focus && 'focus')} onMouseDown={() => go(it)}>
      {it.p ? <><Avatar p={it.p} size="sm" /><div className="grow"><div style={{ fontWeight: 500 }}>{it.p.first} {it.p.last}</div><div className="xs muted">{it.p.fileNo} · {it.p.phone}</div></div>{it.p.allergies.length > 0 && <span className="tag allergy">Allergie</span>}</>
        : <><span className="avatar sm" style={{ background: 'var(--bg-2)', color: 'var(--muted)' }}><Icon name={it.m[2]} size={14} /></span><div className="grow">{it.m[1]}<div className="xs muted">Module</div></div></>}
    </div>) : <div className="empty small">{res.isFetching ? 'Recherche…' : 'Aucun résultat'}</div>}</div>}
  </div>;
}

function Shell() {
  const { me, meta, clinic, setClinic, can, logout, clinicById } = useAuth(); const loc = useLocation(); const nav = useNavigate(); const qc = useQueryClient();
  const actions = useActions();
  const [navOpen, setNavOpen] = useState(false); const [dd, setDd] = useState(null); const [scrolled, setScrolled] = useState(false);
  const counters = useGet('/counters', null, { refetchInterval: 60000 });
  const notifs = useGet('/notifications', null, { enabled: dd && dd.k === 'notif' });
  useEffect(() => { setNavOpen(false); window.scrollTo(0, 0); }, [loc.pathname]);
  useEffect(() => { const s = () => setScrolled(window.scrollY > 4); window.addEventListener('scroll', s, { passive: true }); return () => window.removeEventListener('scroll', s); }, []);

  const seg = loc.pathname.replace(/^\/app\/?/, '').split('/')[0];
  const item = FLAT.find(n => n[0] === seg); const locked = item && item[3] && !can(item[3]);
  useEffect(() => { document.title = (item ? item[1] : seg === 'compte' ? 'Mon compte' : 'Nacre') + ' — Nacre'; }, [item, seg]);
  const c = counters.data || {};
  const clinicName = clinic === 'all' ? 'Tous les cabinets' : (clinicById(clinic) || {}).name;
  const open = (k, e) => setDd(d => (d && d.k === k ? null : { k, el: e.currentTarget }));
  const readAll = async () => { await post('/notifications/read-all'); qc.invalidateQueries({ queryKey: ['/notifications'] }); qc.invalidateQueries({ queryKey: ['/counters'] }); };

  return <div className={cx('shell', navOpen && 'nav-open')}>
    <aside className="sidebar" aria-label="Navigation principale">
      <Link to="/app" className="brand" style={{ color: 'inherit' }}><div className="brand-mark"><Icon name="tooth" /></div><div><div className="brand-name">Nacre</div><div className="brand-sub">Dental OS</div></div></Link>
      <div className="clinic-switch" role="button" tabIndex={0} onClick={e => open('clinic', e)}>
        <div className="clinic-dot"><Icon name={clinic === 'all' ? 'layers' : 'building'} /></div>
        <div className="grow" style={{ minWidth: 0 }}><div className="xs faint">{meta.general.group}</div><div style={{ fontWeight: 600, fontSize: 13 }} className="truncate">{clinicName}</div></div>
        {me.allowedClinics.length > 1 && <Icon name="chevronDown" className="faint" />}
      </div>
      <nav className="nav">{NAV.map(([g, items]) => <div key={g}><div className="nav-group">{g}</div>{items.map(([id, label, ic, perm]) => {
        const lk = perm && !can(perm); const n = c[id];
        return <NavLink key={id} to={'/app' + (id ? '/' + id : '')} end={!id} className={({ isActive }) => cx(isActive && 'active', lk && 'locked')}><Icon name={ic} /><span>{label}</span>
          {lk ? <span className="count"><Icon name="lock" /></span> : n ? <span className={cx('count', ALERT_COUNTS.includes(id) && 'alert')}>{n}</span> : null}</NavLink>;
      })}</div>)}</nav>
      <div className="sidebar-foot"><div className="upgrade"><div className="row gap-6" style={{ marginBottom: 4 }}><Icon name="sparkles" /><b>Plan Clinique</b></div><div style={{ opacity: .8 }}>{meta.clinics.length} sites · {meta.staff.length} utilisateurs · IA incluse</div></div></div>
    </aside>
    <div className="scrim" onClick={() => setNavOpen(false)} />
    <div className="main">
      <header className={cx('topbar', scrolled && 'scrolled')}>
        <button className="icon-btn menu-btn" onClick={() => setNavOpen(true)} aria-label="Menu"><Icon name="menu" /></button>
        <GlobalSearch />
        <div className="top-actions">
          {can('agenda.manage') && <button className="btn primary hide-sm" onClick={() => actions.newAppt()}><Icon name="plus" />Nouveau RDV</button>}
          <button className="icon-btn" onClick={e => open('notif', e)} aria-label="Notifications"><Icon name="bell" />{c.notifications > 0 && <span className="dot" />}</button>
          <div className="user-chip" role="button" tabIndex={0} onClick={e => open('user', e)}><Avatar p={me.user} size="sm" /><div className="who"><b>{sname(me.user)}</b><span>{meta.roles[me.user.role]}{me.user.isAdmin && me.user.role !== 'admin' ? ' · Admin' : ''}</span></div><Icon name="chevronDown" className="faint hide-md" /></div>
        </div>
      </header>
      <main className="content" key={loc.pathname}>{locked ? <Locked label={item[1]} /> : <ErrorBoundary resetKey={loc.pathname}><Outlet /></ErrorBoundary>}</main>
    </div>
    <nav className="bottom-bar" aria-label="Navigation mobile">
      <NavLink to="/app/agenda" className={({ isActive }) => isActive ? 'on' : ''}><Icon name="calendar" />Agenda</NavLink>
      <NavLink to="/app/patients" className={({ isActive }) => isActive ? 'on' : ''}><Icon name="users" />Patients</NavLink>
      <a href="#nouveau" onClick={e => { e.preventDefault(); actions.newAppt(); }}><span className="plus"><Icon name="plus" /></span></a>
      <NavLink to="/app/paiements" className={({ isActive }) => isActive ? 'on' : ''}><Icon name="wallet" />Paiements</NavLink>
      <NavLink to="/app" end className={({ isActive }) => isActive ? 'on' : ''}><Icon name="dashboard" />Accueil</NavLink>
    </nav>

    {dd && dd.k === 'clinic' && me.allowedClinics.length > 1 && <Dropdown anchor={dd.el} onClose={() => setDd(null)} minWidth={dd.el.offsetWidth}>
      <div className="dd-label">Établissement</div>
      {meta.clinics.filter(x => me.allowedClinics.includes(x.id)).map(x => <div key={x.id} className={cx('dd-item', clinic === x.id && 'on')} onClick={() => { setClinic(x.id); setDd(null); }}><Icon name="building" /><div className="grow">{x.name}<div className="xs muted">{meta.staff.filter(s => s.clinicId === x.id && s.role === 'dentiste').length} praticien(s) · {x.chairs.length} fauteuils</div></div></div>)}
      <div className="dd-sep" /><div className={cx('dd-item', clinic === 'all' && 'on')} onClick={() => { setClinic('all'); setDd(null); }}><Icon name="layers" /><div className="grow">Tous les cabinets<div className="xs muted">Vue direction consolidée</div></div></div>
    </Dropdown>}
    {dd && dd.k === 'notif' && <Dropdown anchor={dd.el} align="right" className="notif-panel" onClose={() => setDd(null)}>
      <div className="np-head"><b>Notifications</b><button className="btn ghost xs" onClick={readAll}>Tout marquer comme lu</button></div>
      <div className="np-list">{(notifs.data || []).map(n => <div key={n.id} className={cx('np-item', !n.read && 'unread')} onClick={async () => { await post(`/notifications/${n.id}/read`); qc.invalidateQueries({ queryKey: ['/counters'] }); setDd(null); if (n.link) nav('/app' + n.link.replace(/^#?\//, '/')); }}>
        <div className={cx('ico', (NK[n.kind] || NK.alert)[1])}><Icon name={(NK[n.kind] || NK.alert)[0]} /></div><div className="grow"><div style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div><div className="small muted">{n.text}</div><div className="xs faint mt-4">{fmt.ago(n.at)}</div></div></div>)}
        {notifs.data && !notifs.data.length && <div className="empty">Aucune notification</div>}</div>
    </Dropdown>}
    {dd && dd.k === 'user' && <Dropdown anchor={dd.el} align="right" onClose={() => setDd(null)}>
      <div className="dd-label">{me.user.email}</div>
      <Link className="dd-item" to="/app/compte" style={{ color: 'inherit' }} onClick={() => setDd(null)}><Icon name="shield" />Mon compte & sécurité (2FA)</Link>
      <div className="dd-sep" />
      <Link className="dd-item" to="/" style={{ color: 'inherit' }}><Icon name="globe" />Site vitrine</Link>
      <a className="dd-item" href="/rdv" target="_blank" rel="noreferrer" style={{ color: 'inherit' }}><Icon name="calendar" />Page « Prendre rendez-vous »</a>
      <a className="dd-item" href="/portail" target="_blank" rel="noreferrer" style={{ color: 'inherit' }}><Icon name="smartphone" />Portail patient</a>
      <div className="dd-sep" />
      <div className="dd-item" onClick={async () => { setDd(null); await logout(); nav('/login'); }}><Icon name="logout" />Se déconnecter</div>
    </Dropdown>}
    <Assistant />
  </div>;
}

export default function AppShell() { return <ActionsProvider><Shell /></ActionsProvider>; }
