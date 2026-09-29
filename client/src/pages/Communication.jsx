import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { patch, post, useAction, useGet } from '../lib/api';
import { Async, Avatar, Card, Empty, Field, Icon, Modal, PageHead, Switch, Tabs, useRun, cx } from '../ui';
import { HBars } from '../ui/charts';
import { PatientPicker } from '../components/Modals';
import { fmt, pname } from '../lib/format';

export const CH = { chat: ['Chat sécurisé', 'lock', '#2C6BCB'], sms: ['SMS', 'smartphone', '#5E9F8D'], email: ['Email', 'mail', '#12264A'], whatsapp: ['WhatsApp', 'whatsapp', '#25A366'], notif: ['Notification', 'bell', '#B89457'] };
const ChIcon = ({ c }) => <span title={CH[c][0]} style={{ color: CH[c][2], display: 'inline-flex' }}><Icon name={CH[c][1]} size={12} /></span>;

export function Bubble({ m }) {
  const cls = m.dir === 'in' ? 'in' : m.auto ? 'auto' : 'out';
  return <div className={cx('msg', cls)}>{m.auto && <div className="xs" style={{ fontWeight: 600, marginBottom: 3, opacity: 0.8 }}><Icon name="zap" size={11} style={{ display: 'inline', verticalAlign: -1 }} /> Envoi automatique</div>}{m.text}
    <div className="mt">{m.dir !== 'in' && <ChIcon c={m.channel} />}{CH[m.channel][0]} · {fmt.rel(String(m.at).slice(0, 10))} {fmt.time(m.at)}{m.dir === 'out' && ' · ✓✓'}</div></div>;
}

export default function Communication() {
  const [sp, setSp] = useSearchParams(); const tab = sp.get('onglet') || 'inbox';
  return <>
    <PageHead title="Communication" sub="SMS, email, notifications mobiles, WhatsApp et chat sécurisé" />
    <div className="mb-16"><Tabs value={tab} onChange={k => setSp(k === 'inbox' ? {} : { onglet: k })} tabs={[{ key: 'inbox', label: 'Messagerie', icon: 'message' }, { key: 'rappels', label: 'Rappels automatiques', icon: 'zap' }, { key: 'modeles', label: 'Modèles de messages', icon: 'file' }]} /></div>
    {tab === 'rappels' ? <Rules /> : tab === 'modeles' ? <Templates /> : <Inbox />}
  </>;
}

function Inbox() {
  const { pid } = useParams(); const nav = useNavigate(); const act = useAction(); const run = useRun();
  const [q, setQ] = useState(''); const [channel, setChannel] = useState('chat'); const [text, setText] = useState(''); const [newT, setNewT] = useState(false); const body = useRef(null);
  const threads = useGet('/threads'); const list = (threads.data || []).filter(t => !q || pname(t.patient).toLowerCase().includes(q.toLowerCase()));
  const sel = pid || (list[0] && list[0].patientId);
  const thread = useGet(sel ? `/threads/${sel}` : null); const tpls = useGet('/templates');
  useEffect(() => { if (body.current) body.current.scrollTop = body.current.scrollHeight; }, [thread.data]);
  const p = thread.data && thread.data.patient;
  const send = () => { if (!text.trim()) return; run(() => act(() => post('/messages', { patientId: sel, channel, text })), 'Message envoyé via ' + CH[channel][0], 'send').then(() => setText('')).catch(() => { }); };
  const insert = async id => { const t = (tpls.data || []).find(x => x.id === id); if (!t) return; const r = await post('/templates/preview', { patientId: sel, text: t.text }); setText(r.text); };
  return <div className="card inbox">
    <div className="inbox-list"><div style={{ padding: 12 }}><div className="search"><Icon name="search" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher…" style={{ paddingRight: 12 }} /></div><button className="btn sm mt-8" style={{ width: '100%' }} onClick={() => setNewT(true)}><Icon name="plus" />Nouveau message</button></div>
      {list.map(t => <Link key={t.patientId} className={cx('thread', t.patientId === sel && 'on')} to={`/app/communication/${t.patientId}`} style={{ color: 'inherit' }}><Avatar p={t.patient} size="sm" /><div className="grow" style={{ minWidth: 0 }}><div className="row between"><b className="truncate" style={{ fontSize: 13 }}>{pname(t.patient)}</b><span className="xs faint nowrap">{fmt.ago(t.last.at)}</span></div><div className="tx">{t.last.dir === 'in' ? '' : 'Vous : '}{t.last.text}</div></div>{t.unread > 0 && <span className="badge st-noshow">{t.unread}</span>}</Link>)}</div>
    <div className="chat">{!sel ? <Empty text="Aucune conversation" icon="message" /> : !p ? <div className="empty">Chargement…</div> : <>
      <div className="chat-head"><Avatar p={p} size="sm" /><div className="grow"><b>{pname(p)}</b><div className="xs muted">{p.phone} · {p.email}</div></div><div className="row gap-6 hide-sm">{['sms', 'email', 'whatsapp'].map(k => <span key={k} className={'badge ' + (p.consent[k] ? 'st-termine' : 'st-annule')}>{CH[k][0]}</span>)}</div><Link className="btn sm" to={`/app/patients/${p.id}`}>Fiche</Link></div>
      <div className="chat-body" ref={body}>{thread.data.messages.map(m => <Bubble key={m.id} m={m} />)}{!thread.data.messages.length && <div className="muted small center">Démarrez la conversation</div>}</div>
      <div className="chat-compose">
        <div className="row wrap between" style={{ gap: 8 }}><div className="chips">{Object.entries(CH).map(([k, v]) => <button key={k} className={cx('chip', channel === k && 'on')} onClick={() => setChannel(k)}>{v[0]}</button>)}</div>
          <select className="select sm" style={{ width: 240 }} value="" onChange={e => insert(e.target.value)}><option value="">Insérer un modèle…</option>{(tpls.data || []).map(t => <option key={t.id} value={t.id}>{t.cat} — {t.name}</option>)}</select></div>
        <div className="row"><textarea className="textarea" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(); }} placeholder={`Écrire un message à ${p.first}… (Ctrl + Entrée pour envoyer)`} style={{ minHeight: 52, height: 52 }} /><button className="btn primary" style={{ height: 52 }} onClick={send}><Icon name="send" />Envoyer</button></div>
        <div className="xs faint">{channel === 'chat' ? '🔒 Messagerie sécurisée — visible dans l’espace patient.' : channel === 'whatsapp' ? 'Via l’intégration WhatsApp Business (si activée).' : `Envoi via la passerelle ${CH[channel][0]} du cabinet.`}</div>
      </div></>}</div>
    {newT && <NewThread onClose={() => setNewT(false)} onPick={id => { setNewT(false); nav(`/app/communication/${id}`); }} />}
  </div>;
}
function NewThread({ onClose, onPick }) { const [v, setV] = useState(''); return <Modal title="Nouveau message" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" disabled={!v} onClick={() => onPick(v)}>Ouvrir la conversation</button></>}><Field label="Patient"><PatientPicker value={v} onChange={setV} autoFocus /></Field></Modal>; }

function Rules() {
  const q = useGet('/reminder-rules'); const tpls = useGet('/templates'); const act = useAction(); const run = useRun();
  return <Async q={q}>{({ rules, log }) => <div className="grid g-3-2" style={{ alignItems: 'start' }}>
    <div className="col gap-16">{rules.map(r => { const t = (tpls.data || []).find(x => x.id === r.templateId); return <div key={r.id} className="card"><div className="card-body">
      <div className="row between"><div className="row"><span className="avatar sm" style={{ background: r.on ? 'var(--primary-50)' : 'var(--bg-2)', color: r.on ? 'var(--primary)' : 'var(--faint)' }}><Icon name="zap" size={14} /></span><div><b>{r.name}</b><div className="xs muted"><Icon name="clock" size={11} style={{ display: 'inline', verticalAlign: -1 }} /> {r.when} · {fmt.num(r.sent)} envois</div></div></div>
        <Switch checked={r.on} onChange={v => run(() => act(() => patch(`/reminder-rules/${r.id}`, { on: v })), `${r.name} ${v ? 'activé' : 'désactivé'}`, 'zap').catch(() => { })} /></div>
      <div className="row wrap mt-12" style={{ gap: 14 }}>{Object.entries({ sms: 'SMS', email: 'Email', push: 'Notification mobile', whatsapp: 'WhatsApp' }).map(([k, l]) => <label key={k} className="check small"><input type="checkbox" checked={!!r.channels[k]} onChange={e => run(() => act(() => patch(`/reminder-rules/${r.id}`, { channels: { [k]: e.target.checked } }))).catch(() => { })} /> {l}</label>)}</div>
      {t && <div className="msg auto mt-12" style={{ maxWidth: '100%', alignSelf: 'auto' }}>{t.text}</div>}
    </div></div>; })}</div>
    <div className="col gap-16">
      <Card title="Performance des rappels"><HBars fmtV={v => v + ' %'} rows={[{ label: 'Taux de confirmation', value: 87, color: 'var(--primary)' }, { label: 'Taux de lecture SMS', value: 96, color: 'var(--sage)' }, { label: 'Taux de lecture WhatsApp', value: 98, color: '#25A366' }, { label: 'Taux d’ouverture email', value: 64, color: 'var(--navy)' }]} /><div className="divider" /><div className="small muted">Les rappels partent automatiquement toutes les 5 minutes selon les règles actives (24h et 3h avant, rappel renforcé, message après rendez-vous).</div></Card>
      <Card title="Journal des envois automatiques"><div className="list">{log.map(m => <div key={m.id} className="li"><div className="grow" style={{ minWidth: 0 }}><div className="small"><b>{pname(m.patient)}</b> <ChIcon c={m.channel} /></div><div className="xs muted truncate">{m.text}</div></div><span className="xs faint nowrap">{fmt.ago(m.at)}</span></div>)}</div></Card>
    </div>
  </div>}</Async>;
}

function Templates() {
  const q = useGet('/templates'); const [edit, setEdit] = useState(null); const act = useAction(); const run = useRun();
  return <Async q={q}>{list => <>
    <div className="grid g2">{list.map(t => <div key={t.id} className="card"><div className="card-head"><div><h3>{t.name}</h3><div className="sub">{t.cat}</div></div><button className="btn sm" onClick={() => setEdit({ ...t })}><Icon name="edit" />Modifier</button></div><div className="card-body"><p className="small" style={{ color: 'var(--ink-2)' }}>{t.text.split(/(\{\w+\})/g).map((x, i) => x.startsWith('{') ? <span key={i} className="tag" style={{ height: 18 }}>{x}</span> : x)}</p></div></div>)}</div>
    <p className="xs muted mt-16">Variables : {'{prenom} {nom} {dentiste} {date} {heure} {quand} {cabinet} {telephone} {montant} {lien}'}</p>
    {edit && <Modal title="Modifier le modèle" onClose={() => setEdit(null)} footer={<><button className="btn" onClick={() => setEdit(null)}>Annuler</button><button className="btn primary" onClick={() => run(() => act(() => patch(`/templates/${edit.id}`, { name: edit.name, text: edit.text })), 'Modèle enregistré').then(() => setEdit(null)).catch(() => { })}>Enregistrer</button></>}>
      <Field label="Nom"><input className="input" value={edit.name} onChange={e => setEdit(s => ({ ...s, name: e.target.value }))} /></Field><Field label="Texte" style={{ marginTop: 12 }}><textarea className="textarea" style={{ minHeight: 140 }} value={edit.text} onChange={e => setEdit(s => ({ ...s, text: e.target.value }))} /></Field></Modal>}
  </>}</Async>;
}
