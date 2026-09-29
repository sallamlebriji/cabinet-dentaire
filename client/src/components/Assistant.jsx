/* Assistant IA administratif — panneau flottant. Ouverture programmatique : window.dispatchEvent(new CustomEvent('nacre:assistant', { detail: { task, patientId } })) */
import { Fragment, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { post, useAction, useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { Icon, useUI } from '../ui';
import { PatientPicker } from './Modals';

const SUGG = [['summary', 'Résumer l’historique du patient'], ['notes', 'Résumer des notes cliniques'], ['report', 'Préparer un compte rendu'], ['followups', 'Suivis à planifier'], ['agenda', 'Organiser l’agenda de demain'], ['reminder', 'Générer un rappel'], ['template', 'Modèle de communication']];
const NEED_PATIENT = ['summary', 'report', 'reminder'];
const TEMPLATES = ['Instructions avant chirurgie', 'Conseils après détartrage', 'Retard du praticien', 'Fermeture exceptionnelle', 'Relance devis'];

/** Rendu minimal : **gras**, _italique_, retours à la ligne */
function Rich({ text }) {
  return <div className="ai-text">{text.split('\n').map((line, i) => <Fragment key={i}>{line.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, j) => part.startsWith('**') ? <b key={j}>{part.slice(2, -2)}</b> : part.startsWith('_') && part.endsWith('_') && part.length > 2 ? <em key={j}>{part.slice(1, -1)}</em> : part)}{'\n'}</Fragment>)}</div>;
}

export default function Assistant() {
  const { me, can } = useAuth(); const { toast, confirm } = useUI(); const nav = useNavigate(); const loc = useLocation(); const act = useAction();
  const [open, setOpen] = useState(false); const [msgs, setMsgs] = useState([]); const [busy, setBusy] = useState(false); const [q, setQ] = useState('');
  const [ctxPid, setCtxPid] = useState(null); const body = useRef(null);
  const status = useGet('/assistant/status', null, { enabled: open, staleTime: 600000 });
  useEffect(() => { const m = loc.pathname.match(/\/app\/(patients|odontogramme|communication)\/(p[\w]+)/); if (m) setCtxPid(m[2]); }, [loc.pathname]);
  useEffect(() => { if (body.current) body.current.scrollTop = body.current.scrollHeight; }, [msgs, busy]);
  useEffect(() => { const h = e => { setOpen(true); const { task, patientId } = e.detail || {}; if (patientId) setCtxPid(patientId); if (task) run(task, { patientId }); }; window.addEventListener('nacre:assistant', h); return () => window.removeEventListener('nacre:assistant', h); }); // eslint-disable-line react-hooks/exhaustive-deps

  const push = m => setMsgs(x => [...x, m]);
  async function run(task, input = {}) {
    const label = (SUGG.find(s => s[0] === task) || [])[1];
    if (NEED_PATIENT.includes(task) && !(input.patientId || ctxPid)) { push({ me: true, text: label }); push({ pick: task }); return; }
    if (task === 'notes' && !input.text) { push({ me: true, text: label }); push({ notes: true }); return; }
    if (task === 'template' && !input.kind) { push({ me: true, text: label }); push({ tpl: true }); return; }
    if (label && !input.silent) push({ me: true, text: input.kind || label });
    setBusy(true);
    try { const r = await post('/assistant/run', { task, patientId: input.patientId || (NEED_PATIENT.includes(task) ? ctxPid : undefined), text: input.text, kind: input.kind }); push({ bot: true, ...r }); }
    catch (e) { push({ bot: true, text: e.message }); } finally { setBusy(false); }
  }
  async function ask() { const t = q.trim(); if (!t) return; setQ(''); push({ me: true, text: t }); setBusy(true); try { push({ bot: true, ...(await post('/assistant/run', { task: 'ask', text: t })) }); } catch (e) { push({ bot: true, text: e.message }); } finally { setBusy(false); } }
  async function doAction(a) {
    if (a.href) { nav('/app' + a.href); return; }
    if (['confirmTomorrow', 'sendReminder'].includes(a.action) && !(await confirm('Envoyer les messages ?', a.action === 'sendReminder' ? a.message : 'Une demande de confirmation sera envoyée à chaque patient en attente pour demain.', 'Envoyer'))) return;
    if (a.action === 'generateFollowups') { const r = await act(() => post('/followups/generate')); toast(`${r.created} tâche(s) de suivi créée(s)`, 'sparkles'); nav('/app/suivis'); return; }
    try { const r = await act(() => post('/assistant/action', a)); toast(a.action === 'confirmTomorrow' ? `${r.sent} demande(s) de confirmation envoyée(s)` : a.action === 'saveTemplate' ? 'Modèle ajouté à la communication' : 'Rappel envoyé', 'check'); } catch (e) { toast(e.message, 'alert'); }
  }

  return <>
    <button className="ai-fab" onClick={() => setOpen(o => !o)} aria-label="Assistant IA"><span className="spark"><Icon name="sparkles" /></span><span className="lbl">Assistant IA</span></button>
    {open && <div className="ai-panel" role="dialog" aria-label="Assistant Nacre">
      <div className="ai-head"><span className="brand-mark" style={{ width: 30, height: 30, background: 'rgba(255,255,255,.14)', boxShadow: 'none' }}><Icon name="sparkles" /></span><div><b>Assistant Nacre</b><div className="xs" style={{ opacity: .75 }}>{status.data && status.data.engine === 'claude' ? 'Propulsé par Claude · tâches administratives' : 'Tâches administratives & organisation'}</div></div><button className="x" onClick={() => setOpen(false)} aria-label="Fermer"><Icon name="x" size={16} /></button></div>
      <div className="ai-body" ref={body}>
        <div className="ai-msg">Bonjour {me.user.first}. Je peux vous aider à préparer vos documents administratifs, organiser l’agenda, identifier les suivis et rédiger vos messages patients.</div>
        <div className="ai-sugg">{SUGG.map(([k, l]) => <button key={k} onClick={() => run(k)}>{l}</button>)}</div>
        {msgs.map((m, i) => m.me ? <div key={i} className="ai-msg me">{m.text}</div>
          : m.pick ? <div key={i} className="ai-msg">Pour quel patient ?<div className="mt-8"><PatientPicker value="" onChange={id => { setCtxPid(id); run(m.pick, { patientId: id, silent: true }); }} /></div></div>
            : m.notes ? <NotesInput key={i} onSubmit={t => run('notes', { text: t, silent: true })} />
              : m.tpl ? <div key={i} className="ai-msg">Quel type de message ?<div className="chips mt-8">{TEMPLATES.map(t => <button key={t} className="chip" onClick={() => run('template', { kind: t })}>{t}</button>)}</div></div>
                : <div key={i} className="ai-msg"><Rich text={m.text} />
                  {(m.actions || m.copy) && <div className="row wrap gap-6 mt-8">{(m.actions || []).filter(a => !a.action || can('comm.send') || a.action === 'generateFollowups').map((a, j) => <button key={j} className="btn xs" onClick={() => doAction(a)}><Icon name={a.href ? 'arrowRight' : 'check'} />{a.label}</button>)}
                    <button className="btn xs" onClick={() => { navigator.clipboard && navigator.clipboard.writeText(m.copy || m.text.replace(/\*\*|_/g, '')); toast('Copié dans le presse-papiers'); }}><Icon name="file" />Copier</button></div>}
                  {m.engine === 'claude' && <div className="xs faint mt-8">Rédigé avec Claude — à relire avant usage.</div>}
                </div>)}
        {busy && <div className="ai-msg typing"><i /><i /><i /></div>}
      </div>
      <div className="ai-disclaimer"><Icon name="shield" size={11} style={{ display: 'inline', verticalAlign: -1 }} /> Ne pose aucun diagnostic et ne remplace pas le jugement du praticien. Toute suggestion doit être validée.</div>
      <div className="ai-foot"><input className="input" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask()} placeholder="Ex. : résume le dossier d’Ahmed Benali" /><button className="btn primary icon" onClick={ask} aria-label="Envoyer"><Icon name="send" /></button></div>
    </div>}
  </>;
}

function NotesInput({ onSubmit }) {
  const [t, setT] = useState(''); const [sent, setSent] = useState(false);
  return <div className="ai-msg">Collez vos notes cliniques brutes, je les structure en sections (sans interprétation).
    <textarea className="textarea mt-8" style={{ minHeight: 90 }} value={t} disabled={sent} onChange={e => setT(e.target.value)} placeholder="Ex. : pt se plaint sensib froid 26 depuis 2 sem, carie OD visible, composite fait teinte A2, revoir 6 mois…" />
    {!sent && <button className="btn primary xs mt-8" onClick={() => { if (t.trim()) { setSent(true); onSubmit(t); } }}>Structurer</button>}
  </div>;
}
