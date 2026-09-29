import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, post, upload } from '../lib/api';
import { mediaSvg, smile } from '../lib/media';
import { Avatar, Badge, Field, Icon, Loading, MapBadge, Modal, Progress, StatusBadge, Switch, useUI, cx } from '../ui';
import { BeforeAfter } from '../components/Imaging';
import { InvoiceDoc, QuoteDoc, RxDoc, printDoc, quoteTotals } from '../lib/paper';
import { fmt, pname, INV_ST, METHOD, PLAN_ST } from '../lib/format';

const TABS = [['accueil', 'Accueil', 'home'], ['rdv', 'Rendez-vous', 'calendar'], ['plan', 'Mon traitement', 'clipboard'], ['documents', 'Documents', 'folder'], ['factures', 'Factures & paiements', 'wallet'], ['messages', 'Messages', 'message'], ['profil', 'Préférences', 'settings']];
const MOB = ['accueil', 'rdv', 'documents', 'factures', 'messages'];
const pq = (key, url, opts = {}) => ({ queryKey: ['portal', key], queryFn: () => get(url), retry: false, ...opts });

export default function Portal() {
  const qc = useQueryClient(); const me = useQuery(pq('me', '/portal/me'));
  useEffect(() => { document.title = 'Mon espace patient — Nacre'; document.body.classList.add('site'); return () => document.body.classList.remove('site'); }, []);
  if (me.isLoading) return <Loading />;
  if (me.isError) return <Login onIn={() => qc.invalidateQueries({ queryKey: ['portal'] })} />;
  return <Space me={me.data} />;
}

function Login({ onIn }) {
  const { toast } = useUI(); const [phone, setPhone] = useState(''); const [sent, setSent] = useState(null); const [code, setCode] = useState(''); const [busy, setBusy] = useState(false);
  const demo = useQuery({ queryKey: ['portal-demo'], queryFn: () => get('/portal/demo-accounts') });
  const request = async () => { setBusy(true); try { const r = await post('/portal/otp/request', { phone }); setSent(r); if (r.devCode) setCode(r.devCode); } catch (e) { toast(e.message, 'alert'); } finally { setBusy(false); } };
  const verify = async () => { setBusy(true); try { await post('/portal/otp/verify', { phone, code }); onIn(); } catch (e) { toast(e.message, 'alert'); } finally { setBusy(false); } };
  return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, background: 'radial-gradient(circle at 80% 0,rgba(44,107,203,.12),transparent 50%),radial-gradient(circle at 0 100%,rgba(94,159,141,.12),transparent 50%),#FBFBFA' }}>
    <div className="card" style={{ width: '100%', maxWidth: 420, borderRadius: 22, boxShadow: 'var(--shadow-lg)' }}><div className="card-body" style={{ padding: 32 }}>
      <div className="brand-mark" style={{ width: 48, height: 48, borderRadius: 14, marginBottom: 18 }}><Icon name="tooth" size={24} /></div>
      <h1 className="serif" style={{ fontSize: 28, color: 'var(--navy)', fontWeight: 500 }}>Mon espace patient</h1><p className="muted mt-4">Rendez-vous, documents, factures et messagerie.</p>
      <div className="mt-24">{!sent ? <><Field label="Numéro de mobile"><input className="input" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="06 00 00 00 00" /></Field><button className="btn primary mt-16" style={{ width: '100%', height: 44 }} disabled={busy || phone.replace(/\D/g, '').length < 9} onClick={request}>Recevoir un code par SMS</button></>
        : <><Field label="Code reçu par SMS"><input className="input otp-input" inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} autoFocus /></Field><p className="xs muted mt-8">Si ce numéro correspond à un dossier, un code a été envoyé au {sent.masked}. Valable 10 minutes.{sent.devCode && <><br /><b>Mode développement :</b> code pré-rempli (affiché aussi dans la console du serveur).</>}</p>
          <button className="btn primary mt-16" style={{ width: '100%', height: 44 }} disabled={busy || code.length !== 6} onClick={verify}>Se connecter</button><button className="btn ghost mt-8" style={{ width: '100%' }} onClick={() => { setSent(null); setCode(''); }}>Changer de numéro</button></>}</div>
      {(demo.data || []).length > 0 && <><div className="divider" /><div className="xs muted mb-8">Démo — numéros de patients existants :</div><div className="chips">{demo.data.map(p => <button key={p.id} className="chip" onClick={() => { setPhone(p.phone); setSent(null); }}>{pname(p)}</button>)}</div></>}
      <p className="xs faint mt-16"><Icon name="lock" size={11} style={{ display: 'inline', verticalAlign: -1 }} /> Connexion sécurisée par code à usage unique. <Link to="/rdv">Prendre rendez-vous sans compte</Link></p>
    </div></div></div>;
}

function Space({ me }) {
  const qc = useQueryClient(); const [tab, setTab] = useState('accueil'); const p = me.patient;
  const logout = async () => { await post('/portal/logout'); qc.removeQueries({ queryKey: ['portal'] }); qc.invalidateQueries({ queryKey: ['portal'] }); };
  const go = t => { setTab(t); window.scrollTo(0, 0); };
  const View = { accueil: Home, rdv: Rdv, plan: Plan, documents: Docs, factures: Bills, messages: Messages, profil: Prefs }[tab];
  return <div className="portal">
    <aside className="p-side"><div className="row" style={{ gap: 10, padding: '4px 8px 18px' }}><span className="brand-mark"><Icon name="tooth" /></span><div><b style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--navy)', fontWeight: 500 }}>{me.clinic ? me.clinic.name : 'Cabinet'}</b><div className="xs muted">Espace patient</div></div></div>
      <nav className="p-nav">{TABS.map(([k, l, ic]) => <a key={k} href={'#' + k} onClick={e => { e.preventDefault(); go(k); }} className={tab === k ? 'on' : ''}><Icon name={ic} />{l}{k === 'messages' && me.unread > 0 && <span className="dotn">{me.unread}</span>}</a>)}</nav>
      <div className="card" style={{ marginTop: 'auto' }}><div className="card-body row"><Avatar p={p} size="sm" /><div className="grow" style={{ minWidth: 0 }}><b className="small truncate" style={{ display: 'block' }}>{pname(p)}</b><a href="#logout" className="xs" onClick={e => { e.preventDefault(); logout(); }}>Se déconnecter</a></div></div></div></aside>
    <main className="p-main"><View me={me} go={go} /></main>
    <nav className="p-tabs">{TABS.filter(t => MOB.includes(t[0])).map(([k, l, ic]) => <a key={k} href={'#' + k} onClick={e => { e.preventDefault(); go(k); }} className={tab === k ? 'on' : ''}><Icon name={ic} />{l.split(' ')[0]}</a>)}</nav>
  </div>;
}
const Head = ({ t, s }) => <div className="mb-16"><h1 className="serif" style={{ fontSize: 26, color: 'var(--navy)', fontWeight: 500 }}>{t}</h1>{s && <p className="muted mt-4">{s}</p>}</div>;
function useDo() { const qc = useQueryClient(); const { toast } = useUI(); return async (fn, msg, icon = 'check') => { try { const r = await fn(); if (msg) toast(msg, icon); await qc.invalidateQueries({ queryKey: ['portal'] }); return r; } catch (e) { toast(e.message, 'alert'); throw e; } }; }
const planSum = pl => { const n = pl.items.length, d = pl.items.filter(i => i.status === 'termine').length; const tot = pl.items.reduce((s, i) => s + i.price, 0), paid = pl.items.reduce((s, i) => s + i.paid, 0); return <><div className="row between small"><span>{d} / {n} étapes réalisées</span><b>{Math.round((d / (n || 1)) * 100)} %</b></div><div className="mt-8"><Progress value={(d / (n || 1)) * 100} height={8} /></div><div className="row between xs muted mt-8"><span>Total {fmt.money(tot)}</span><span>Reste {fmt.money(tot - paid)}</span></div></>; };

function Home({ me, go }) {
  const run = useDo(); const p = me.patient; const na = me.next; const b = me.balance;
  return <>
    <div className="hello"><div style={{ position: 'relative', zIndex: 1 }}><div style={{ opacity: 0.75 }}>Bonjour</div><h1 className="serif" style={{ fontSize: 30, fontWeight: 500 }}>{p.first}</h1>
      {na ? <div className="row wrap between" style={{ marginTop: 18, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 16, padding: 16 }}><div><div className="xs" style={{ opacity: 0.7, letterSpacing: '.08em' }}>PROCHAIN RENDEZ-VOUS</div><b style={{ fontSize: 18 }}>{fmt.dateLongCap(na.date)} · {fmt.hShort(na.start)}</b><div className="small" style={{ opacity: 0.8 }}>avec {na.dentistName}</div></div>
        {na.status === 'attente' ? <button className="btn gold" onClick={() => run(() => post(`/portal/appointments/${na.id}/confirm`), 'Merci, votre présence est confirmée')}><Icon name="check" />Confirmer ma présence</button> : <span className="badge" style={{ background: 'rgba(255,255,255,.15)', color: '#fff' }}>✓ Confirmé</span>}</div> : <p className="mt-8" style={{ opacity: 0.8 }}>Aucun rendez-vous à venir.</p>}</div></div>
    <div className="qa mt-16"><Link to="/rdv"><span className="ic tone-blue"><Icon name="calendar" /></span>Prendre rendez-vous</Link><button onClick={() => go('documents')}><span className="ic tone-violet"><Icon name="download" /></span>Mes ordonnances</button><button onClick={() => go('factures')}><span className="ic tone-gold"><Icon name="card" /></span>Payer en ligne</button><button onClick={() => go('messages')}><span className="ic tone-teal"><Icon name="message" /></span>Contacter le cabinet</button></div>
    {me.quote && <div className="card mt-16" style={{ borderColor: 'var(--primary-100)', background: 'var(--primary-50)' }}><div className="card-body row wrap between"><div className="row"><Icon name="file" size={22} style={{ color: 'var(--primary)' }} /><div><b>Un devis vous attend</b><div className="small muted">{me.quote.number} · {fmt.money(quoteTotals(me.quote).total)}</div></div></div><button className="btn primary sm" onClick={() => go('plan')}>Consulter & accepter</button></div></div>}
    <div className="grid g2 mt-16">
      {me.plan && <div className="card"><div className="card-head"><h3>Mon traitement</h3><a href="#plan" className="small" onClick={e => { e.preventDefault(); go('plan'); }}>Détails</a></div><div className="card-body">{planSum(me.plan)}</div></div>}
      <div className="card"><div className="card-head"><h3>Mon compte</h3></div><div className="card-body"><div className="row between"><span className="muted">Total des soins</span><b>{fmt.money(b.total)}</b></div><div className="row between mt-8"><span className="muted">Réglé</span><b style={{ color: 'var(--success)' }}>{fmt.money(b.paid)}</b></div><div className="mt-8"><Progress value={b.total ? (b.paid / b.total) * 100 : 0} tone="sage" /></div><div className="row between mt-12"><span>Reste à régler</span><b style={{ fontSize: 18, color: b.due > 0 ? 'var(--danger)' : 'inherit' }}>{fmt.money(b.due)}</b></div>{b.due > 0 && <button className="btn primary sm mt-12" onClick={() => go('factures')}><Icon name="card" />Payer en ligne</button>}</div></div>
    </div>
    <div className="card mt-16"><div className="card-head"><h3>Notifications & rappels</h3></div><div className="card-body"><div className="list">{me.notifications.map(m => <div key={m.id} className="li"><span className="avatar sm" style={{ background: 'var(--bg-2)', color: 'var(--muted)' }}><Icon name={m.channel === 'email' ? 'mail' : m.channel === 'whatsapp' ? 'whatsapp' : m.channel === 'chat' ? 'message' : 'bell'} size={14} /></span><div className="grow" style={{ minWidth: 0 }}><div className="small">{m.text}</div><div className="xs faint">{fmt.ago(m.at)}</div></div></div>)}{!me.notifications.length && <div className="small muted">Aucune notification</div>}</div></div></div>
  </>;
}

function Rdv() {
  const run = useDo(); const { confirm } = useUI(); const q = useQuery(pq('appts', '/portal/appointments')); const [move, setMove] = useState(null);
  if (q.isLoading) return <Loading />;
  const list = q.data; const up = list.filter(a => a.hoursUntil > 0 && ['confirme', 'attente'].includes(a.status)).reverse(); const past = list.filter(a => !up.includes(a)).slice(0, 10);
  return <>
    <Head t="Mes rendez-vous" s="Modification et annulation gratuites jusqu’à 24h avant." />
    <Link className="btn primary mb-16" to="/rdv"><Icon name="plus" />Prendre un nouveau rendez-vous</Link>
    <h3 className="small muted mb-8" style={{ textTransform: 'uppercase', letterSpacing: '.08em' }}>À venir</h3>
    <div className="col gap-16">{up.map(a => <div key={a.id} className="card"><div className="card-body row wrap" style={{ gap: 14 }}>
      <div style={{ width: 60, textAlign: 'center', borderRadius: 12, background: 'var(--primary-50)', padding: '8px 0', flex: 'none' }}><div className="xs" style={{ color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase' }}>{fmt.dow(a.date)}</div><div style={{ fontSize: 22, fontWeight: 600 }}>{a.date.slice(8, 10)}</div><div className="xs muted">{fmt.mshort(a.date)}</div></div>
      <div className="grow" style={{ minWidth: 180 }}><b>{fmt.hShort(a.start)} · {a.dentistName}</b><div className="small muted">{a.dur} min</div><div className="mt-4"><StatusBadge status={a.status} /></div></div>
      <div className="row wrap gap-6">{a.status === 'attente' && <button className="btn sm primary" onClick={() => run(() => post(`/portal/appointments/${a.id}/confirm`), 'Présence confirmée')}><Icon name="check" />Confirmer</button>}
        <button className="btn sm" disabled={a.hoursUntil < 24} title={a.hoursUntil < 24 ? 'Moins de 24h : contactez le cabinet' : ''} onClick={() => setMove(a)}><Icon name="repeat" />Modifier</button>
        <button className="btn sm danger" disabled={a.hoursUntil < 24} onClick={async () => { if (await confirm('Annuler ce rendez-vous ?', `Rendez-vous du ${fmt.dateLong(a.date)} à ${fmt.hShort(a.start)}. Le créneau sera libéré pour un autre patient.`, 'Annuler le rendez-vous', true)) run(() => post(`/portal/appointments/${a.id}/cancel`), 'Rendez-vous annulé'); }}>Annuler</button></div>
    </div></div>)}{!up.length && <div className="card card-pad muted small">Aucun rendez-vous à venir.</div>}</div>
    <h3 className="small muted mt-24 mb-8" style={{ textTransform: 'uppercase', letterSpacing: '.08em' }}>Historique</h3>
    <div className="card"><div className="card-body"><div className="list">{past.map(a => <div key={a.id} className="li"><div className="grow"><div className="t">{fmt.dateLong(a.date)} · {a.start}</div><div className="s">{a.dentistName}</div></div><StatusBadge status={a.status} /></div>)}</div></div></div>
    {move && <MoveModal a={move} onClose={() => setMove(null)} />}
  </>;
}
function MoveModal({ a, onClose }) {
  const run = useDo(); const q = useQuery({ queryKey: ['portal', 'days', a.id], queryFn: () => get(`/portal/appointments/${a.id}/days`) }); const [d, setD] = useState(null); const [t, setT] = useState(null);
  return <Modal title="Modifier mon rendez-vous" size="lg" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" disabled={!t} onClick={() => run(() => post(`/portal/appointments/${a.id}/move`, { date: d.date, time: t }), 'Rendez-vous déplacé · confirmation envoyée').then(onClose).catch(() => { })}>Confirmer le changement</button></>}>
    <p className="small muted mb-12">Avec {a.dentistName} · {a.dur} min</p>
    {q.isLoading ? <Loading /> : <><div className="days">{q.data.map(x => <div key={x.date} className={cx('day', d && d.date === x.date && 'on', !x.slots.length && 'off')} onClick={() => { setD(x); setT(null); }}><div className="dw">{fmt.dow(x.date)}</div><div className="dd">{x.date.slice(8, 10)}</div><div className="dc">{x.slots.length} créneaux</div></div>)}</div>
      {d && <div className="slots mt-16">{d.slots.map(s => <button key={s} className={cx('slot', t === s && 'on')} onClick={() => setT(s)}>{s}</button>)}</div>}</>}
  </Modal>;
}

function Plan({ me }) {
  const run = useDo(); const q = useQuery(pq('plans', '/portal/plans')); const meta = useQuery(pq('meta', '/portal/meta', { staleTime: 600000 })); const [view, setView] = useState(null); const [sign, setSign] = useState(null);
  if (q.isLoading || meta.isLoading) return <Loading />;
  const { plans, quotes } = q.data;
  return <>
    <Head t="Mon plan de traitement" s="Suivez l’avancement de vos soins et vos devis." />
    {quotes.length > 0 && <div className="card mb-16"><div className="card-head"><h3>Mes devis</h3></div><div className="card-body"><div className="list">{quotes.map(x => { const ok = x.status === 'envoye' && x.valid >= new Date().toISOString().slice(0, 10); return <div key={x.id} className="li"><div className="grow"><div className="t">{x.number}</div><div className="s">{fmt.date(x.date)} · {fmt.money(quoteTotals(x).total)}{x.status === 'accepte' ? ' · signé le ' + fmt.date(x.acceptedAt) : ''}</div></div><button className="btn sm" onClick={() => setView(x)}><Icon name="eye" />Voir</button>{ok ? <button className="btn sm primary" onClick={() => setSign(x)}><Icon name="signature" />Accepter en ligne</button> : <Badge label={x.status === 'accepte' ? 'Accepté' : x.status === 'refuse' ? 'Refusé' : 'Expiré'} cls={x.status === 'accepte' ? 'st-termine' : 'st-annule'} />}</div>; })}</div></div></div>}
    {plans.map(pl => { const tot = pl.items.reduce((s, i) => s + i.price, 0), paid = pl.items.reduce((s, i) => s + i.paid, 0); return <div key={pl.id} className="card mb-16"><div className="card-head"><div><h3>{pl.title}</h3><div className="sub">{pl.dentistName}</div></div></div><div className="card-body">{planSum(pl)}
      <div className="timeline mt-16">{pl.items.map(i => <div key={i.id} className="tl-item"><span className="tl-dot" style={i.status === 'termine' ? { background: 'var(--success)', borderColor: 'var(--success)' } : undefined}>{i.status === 'termine' ? <span style={{ color: '#fff', fontSize: 10 }}>✓</span> : <i />}</span><div className="row between wrap"><div><b style={{ fontWeight: 500 }}>{i.label}</b>{i.tooth && i.tooth !== '—' && <span className="tag" style={{ marginLeft: 6 }}>Dent {i.tooth}</span>}<div className="xs muted">{i.done ? 'Réalisé le ' + fmt.date(i.done) : i.planned ? 'Prévu le ' + fmt.date(i.planned) : 'À planifier'}</div></div><div className="right"><MapBadge map={{ ...PLAN_ST, termine: ['Réalisé', 'st-termine'] }} value={i.status} /><div className="xs muted mt-4">{fmt.money(i.price)}</div></div></div></div>)}</div>
      <div className="grid g3 mt-16" style={{ gap: 8 }}><div style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 12 }}><div className="xs muted">Total traitement</div><b>{fmt.money(tot)}</b></div><div style={{ padding: 12, borderRadius: 12, background: 'var(--success-50)' }}><div className="xs muted">Payé</div><b style={{ color: 'var(--success)' }}>{fmt.money(paid)}</b></div><div style={{ padding: 12, borderRadius: 12, background: 'var(--danger-50)' }}><div className="xs muted">Reste</div><b style={{ color: 'var(--danger)' }}>{fmt.money(tot - paid)}</b></div></div></div></div>; })}
    {!plans.length && <div className="card card-pad muted">Aucun plan de traitement en cours.</div>}
    {view && <Modal title={`Devis ${view.number}`} size="lg" onClose={() => setView(null)} footer={<button className="btn" onClick={() => printDoc(<QuoteDoc q={view} patient={me.patient} meta={meta.data} />)}><Icon name="download" />Télécharger le PDF</button>}><QuoteDoc q={view} patient={me.patient} meta={meta.data} /></Modal>}
    {sign && <SignModal q={sign} patient={me.patient} onClose={() => setSign(null)} onDone={() => { setSign(null); }} run={run} />}
  </>;
}
function SignModal({ q, patient, onClose, onDone, run }) {
  const [s, setS] = useState(''); const [agree, setAgree] = useState(false);
  return <Modal title={`Accepter le devis ${q.number}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" disabled={s.trim().length < 3 || !agree} onClick={() => run(() => post(`/portal/quotes/${q.id}/accept`, { signature: s, agree }), 'Devis accepté — merci ! Le cabinet va planifier vos soins.').then(onDone).catch(() => { })}><Icon name="signature" />Signer et accepter</button></>}>
    <div className="card" style={{ background: 'var(--surface-2)' }}><div className="card-body"><div className="row between"><span className="muted">Montant total</span><b style={{ fontSize: 20 }}>{fmt.money(quoteTotals(q).total)}</b></div><div className="small muted mt-8">{q.conditions}</div></div></div>
    <Field label="Signature — saisissez votre nom complet" style={{ marginTop: 16 }}><input className="input" value={s} onChange={e => setS(e.target.value)} placeholder={pname(patient)} style={{ fontFamily: 'var(--serif)', fontSize: 18 }} /></Field>
    <label className="check mt-12 small"><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} /> J’ai pris connaissance du devis et des conditions, et je donne mon accord pour les soins proposés.</label>
    <p className="xs faint mt-12">Signature électronique horodatée, conservée avec votre adresse IP dans le journal du cabinet.</p>
  </Modal>;
}

function Docs({ me }) {
  const run = useDo(); const q = useQuery(pq('docs', '/portal/documents')); const meta = useQuery(pq('meta', '/portal/meta', { staleTime: 600000 })); const [view, setView] = useState(null); const inp = useRef(null);
  if (q.isLoading || meta.isLoading) return <Loading />;
  const { docs, prescriptions, beforeAfter } = q.data;
  const send = file => { const fd = new FormData(); fd.append('file', file); run(() => upload('/portal/documents', fd), 'Document envoyé au cabinet', 'upload').catch(() => { }); };
  const img = d => (d.hasFile && d.mime && d.mime.startsWith('image/') ? <img src={`/api/portal/documents/${d.id}/file`} alt={d.title} /> : <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: mediaSvg(d.hasFile && d.mime === 'application/pdf' ? { kind: 'pdf' } : d) }} />);
  return <>
    <Head t="Mes documents" s="Ordonnances, comptes rendus et documents partagés par le cabinet." />
    <div className="card mb-16"><div className="card-head"><h3>Ordonnances</h3></div><div className="card-body"><div className="list">{prescriptions.map(r => <div key={r.id} className="li"><span className="avatar sm" style={{ background: 'var(--violet-50)', color: 'var(--violet)' }}><Icon name="pill" size={14} /></span><div className="grow"><div className="t">Ordonnance du {fmt.date(r.date)}</div><div className="s">{r.items.map(i => i.drug).join(' · ')}</div></div><button className="btn sm" onClick={() => printDoc(<RxDoc rx={r} patient={me.patient} meta={meta.data} />)}><Icon name="download" />PDF</button></div>)}{!prescriptions.length && <div className="small muted">Aucune ordonnance</div>}</div></div></div>
    <div className="card mb-16"><div className="card-head"><h3>Documents partagés</h3></div><div className="card-body"><div className="media-grid">{docs.map(d => <div key={d.id} className="media" onClick={() => (d.hasFile && d.mime === 'application/pdf' ? window.open(`/api/portal/documents/${d.id}/file`) : setView(d))}><div className="thumb">{img(d)}{d.fromPortal && <span className="lock">Envoyé par vous</span>}</div><div className="meta"><b className="truncate">{d.title}</b><div className="xs muted">{fmt.date(d.date)}</div></div></div>)}{!docs.length && <div className="small muted">Aucun document partagé pour le moment.</div>}</div></div></div>
    {beforeAfter.length > 0 && <div className="card mb-16"><div className="card-head"><h3>Avant / Après</h3></div><div className="card-body col gap-16">{beforeAfter.map(b => <div key={b.id}><b>{b.title}</b><div className="mt-8"><BeforeAfter before={smile(b.shade[0], 3, b.crowd)} after={smile(b.shade[1], 3)} /></div></div>)}</div></div>}
    <div className="card"><div className="card-head"><h3>Envoyer un document au cabinet</h3></div><div className="card-body"><label className="upload"><Icon name="upload" size={26} style={{ margin: '0 auto 6px' }} /><b>Ajouter un fichier</b><div className="xs">Radiographie d’un autre cabinet, résultats d’analyses, attestation de mutuelle… (JPG, PNG, PDF · 15 Mo max)</div><input ref={inp} type="file" hidden accept="image/*,application/pdf" onChange={e => { if (e.target.files[0]) send(e.target.files[0]); e.target.value = ''; }} /></label></div></div>
    {view && <Modal title={view.title} size="lg" onClose={() => setView(null)}><div className="viewer" style={{ height: 'min(60vh,480px)' }}><div className="stage">{img(view)}</div></div></Modal>}
  </>;
}

function Bills({ me }) {
  const run = useDo(); const q = useQuery(pq('bills', '/portal/invoices')); const meta = useQuery(pq('meta', '/portal/meta', { staleTime: 600000 })); const [pay, setPay] = useState(null);
  if (q.isLoading || meta.isLoading) return <Loading />;
  const { invoices, payments, balance: b } = q.data;
  return <>
    <Head t="Factures & paiements" />
    <div className="grid g3 mb-16"><div className="card card-pad"><div className="xs muted">Total des soins</div><b style={{ fontSize: 20 }}>{fmt.money(b.total)}</b></div><div className="card card-pad"><div className="xs muted">Réglé</div><b style={{ fontSize: 20, color: 'var(--success)' }}>{fmt.money(b.paid)}</b></div><div className="card card-pad"><div className="xs muted">Reste à régler</div><b style={{ fontSize: 20, color: b.due > 0 ? 'var(--danger)' : 'inherit' }}>{fmt.money(b.due)}</b></div></div>
    <div className="card mb-16"><div className="card-head"><h3>Mes factures</h3></div><div className="table-wrap"><table className="table responsive"><thead><tr><th>Facture</th><th>Date</th><th className="num">Montant</th><th className="num">Reste</th><th>Statut</th><th /></tr></thead>
      <tbody>{invoices.map(i => <tr key={i.id}><td data-l="Facture"><b style={{ fontWeight: 500 }}>{i.number}</b><div className="xs muted">{i.items.map(x => x.label).join(', ')}</div></td><td data-l="Date">{fmt.date(i.date)}</td><td data-l="Montant" className="num">{fmt.money(i.total)}</td><td data-l="Reste" className="num">{fmt.money(i.due)}</td><td data-l="Statut"><MapBadge map={INV_ST} value={i.status} /></td><td><div className="row gap-4">{i.due > 0 && <button className="btn xs primary" onClick={() => setPay(i)}>Payer</button>}<button className="btn xs" title="PDF" onClick={() => printDoc(<InvoiceDoc inv={i} patient={me.patient} payments={payments.filter(x => x.invoiceId === i.id)} meta={meta.data} />)}><Icon name="download" /></button></div></td></tr>)}</tbody></table></div></div>
    <div className="card"><div className="card-head"><h3>Historique des paiements</h3></div><div className="card-body"><div className="list">{payments.map(x => <div key={x.id} className="li"><div className="grow"><div className="t">{fmt.money(x.amount)}</div><div className="s">{fmt.date(x.date)} · {METHOD[x.method]}{x.kind === 'acompte' ? ' · acompte' : ''}</div></div><Badge label={x.amount < 0 ? 'Remboursement' : 'Reçu'} cls={x.amount < 0 ? 'st-noshow' : 'st-termine'} /></div>)}{!payments.length && <div className="small muted">Aucun paiement</div>}</div></div></div>
    {pay && <PayModal inv={pay} run={run} onClose={() => setPay(null)} />}
  </>;
}
function PayModal({ inv, run, onClose }) {
  const [amount, setAmount] = useState(inv.due); const [stage, setStage] = useState('form');
  const go = () => { setStage('wait'); setTimeout(() => run(() => post(`/portal/invoices/${inv.id}/pay`, { amount: +amount })).then(() => setStage('ok')).catch(() => setStage('form')), 1200); };
  return <Modal title="Paiement en ligne" onClose={onClose} footer={stage === 'form' ? <><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" onClick={go}><Icon name="card" />Continuer vers le paiement</button></> : stage === 'ok' ? <button className="btn primary" onClick={onClose}>Fermer</button> : null}>
    {stage === 'form' && <><div className="center"><div className="xs muted">Facture {inv.number}</div><div className="serif" style={{ fontSize: 38, color: 'var(--navy)' }}>{fmt.money(inv.due)}</div></div><Field label="Montant à régler" style={{ marginTop: 16 }}><input className="input" type="number" min="50" max={inv.due} value={amount} onChange={e => setAmount(e.target.value)} /></Field>
      <div className="card mt-16" style={{ background: 'var(--surface-2)' }}><div className="card-body small row top"><Icon name="lock" size={18} style={{ color: 'var(--success)' }} /><span>Vous allez être redirigé vers la <b>passerelle de paiement sécurisée</b> de la banque (3-D Secure). Vos coordonnées bancaires ne sont jamais stockées par le cabinet.<br /><span className="muted">Démo : le paiement est simulé.</span></span></div></div></>}
    {stage === 'wait' && <div className="center" style={{ padding: 30 }}><div className="typing"><i /><i /><i /></div><p className="muted mt-12">Connexion à la passerelle sécurisée…</p></div>}
    {stage === 'ok' && <div className="center" style={{ padding: 20 }}><div className="success-mark"><Icon name="check" /></div><h3 className="serif" style={{ fontSize: 22, color: 'var(--navy)' }}>Paiement accepté</h3><p className="muted mt-8">{fmt.money(amount)} réglés. Un reçu vous a été envoyé par email.</p></div>}
  </Modal>;
}

function Messages({ me }) {
  const run = useDo(); const q = useQuery(pq('msgs', '/portal/messages', { refetchInterval: 20000 })); const [t, setT] = useState(''); const body = useRef(null);
  useEffect(() => { if (body.current) body.current.scrollTop = body.current.scrollHeight; }, [q.data]);
  const send = () => { if (!t.trim()) return; run(() => post('/portal/messages', { text: t })).then(() => setT('')).catch(() => { }); };
  return <>
    <Head t="Messagerie sécurisée" s={`Échangez avec l’équipe du cabinet. Pour une urgence, appelez le ${me.clinic ? me.clinic.phone : 'cabinet'}.`} />
    <div className="card" style={{ overflow: 'hidden' }}><div className="chat-body" ref={body} style={{ height: 'min(56vh,520px)' }}>{(q.data || []).map(m => <div key={m.id} className={`msg ${m.dir === 'in' ? 'out' : 'in'}`}>{m.text}<div className="mt">{m.dir === 'in' ? 'Vous' : m.auto ? 'Message automatique' : 'Le cabinet'} · {fmt.rel(String(m.at).slice(0, 10))} {fmt.time(m.at)}</div></div>)}</div>
      <div className="chat-compose"><div className="row"><textarea className="textarea" value={t} onChange={e => setT(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Écrire au cabinet…" style={{ minHeight: 48, height: 48 }} /><button className="btn primary" style={{ height: 48 }} onClick={send} aria-label="Envoyer"><Icon name="send" /></button></div><div className="xs faint"><Icon name="lock" size={11} style={{ display: 'inline', verticalAlign: -1 }} /> Messagerie sécurisée. Réponse sous 24h ouvrées.</div></div></div>
  </>;
}

function Prefs({ me }) {
  const run = useDo(); const p = me.patient;
  return <>
    <Head t="Préférences" s="Choisissez comment recevoir vos rappels." />
    <div className="card mb-16"><div className="card-body col" style={{ gap: 16 }}>{[['sms', 'Rappels par SMS', 'smartphone'], ['whatsapp', 'Rappels par WhatsApp', 'whatsapp'], ['email', 'Confirmations par email', 'mail'], ['photos', 'Autoriser le partage de mes photos avant/après avec moi', 'image']].map(([k, l, ic]) => <div key={k} className="row between"><div className="row"><Icon name={ic} size={18} style={{ color: 'var(--muted)' }} /><span>{l}</span></div><Switch checked={!!p.consent[k]} onChange={v => run(() => patch('/portal/preferences', { [k]: v }), 'Préférence enregistrée')} /></div>)}</div></div>
    <div className="card"><div className="card-head"><h3>Mes informations</h3></div><div className="card-body"><dl className="kv"><dt>Nom</dt><dd>{pname(p)}</dd><dt>Téléphone</dt><dd>{p.phone}</dd><dt>Email</dt><dd>{p.email || '—'}</dd><dt>Adresse</dt><dd>{p.address || '—'}</dd><dt>N° de dossier</dt><dd>{p.fileNo}</dd></dl><p className="xs muted mt-12">Pour modifier ces informations ou exercer vos droits d’accès et de rectification, écrivez au cabinet via la messagerie.</p></div></div>
  </>;
}
