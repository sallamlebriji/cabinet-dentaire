import { useRef, useState } from 'react';
import { patch, upload, useAction } from '../lib/api';
import { mediaSvg, smile } from '../lib/media';
import { useAuth } from '../context/Auth';
import { Badge, Icon, Modal, Segmented, useRun, cx } from '../ui';
import { fmt, pname } from '../lib/format';

export const CAT = { radio: ['Radiographies', 'scan'], photo: ['Photos intra-orales', 'image'], scanner: ['Scanner / 3D', 'layers'], pdf: ['Documents PDF', 'file'], labo: ['Laboratoire', 'flask'] };
const svgBox = html => <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: html }} />;

/** Rendu d'un document : fichier réel (image / PDF) ou imagerie de démonstration */
export function Media({ doc, fileBase = '/api/documents' }) {
  const hasFile = doc.filePath || doc.hasFile;
  if (hasFile && doc.mime && doc.mime.startsWith('image/')) return <img src={`${fileBase}/${doc.id}/file`} alt={doc.title} />;
  if (hasFile && doc.mime === 'application/pdf') return svgBox(mediaSvg({ kind: 'pdf' }));
  return svgBox(mediaSvg(doc));
}

export function MediaGrid({ docs, withPatient, group = 'date', onOpen }) {
  if (!docs.length) return <div className="card"><div className="empty"><Icon name="image" /><div>Aucun document dans cette sélection</div></div></div>;
  const groups = {};
  docs.forEach(d => { const k = group === 'type' ? (CAT[d.cat] ? CAT[d.cat][0] : 'Autres') : group === 'consult' ? d.consult || 'Hors consultation' : fmt.month(d.date); (groups[k] = groups[k] || []).push(d); });
  return Object.entries(groups).map(([k, arr]) => <div key={k} className="mb-16"><div className="row between mb-12"><h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>{k}</h3><span className="xs muted">{arr.length}</span></div>
    <div className="media-grid">{arr.map(d => <div key={d.id} className="media" onClick={() => onOpen(d)}><div className="thumb"><Media doc={d} />{d.fromPortal ? <span className="lock">Envoyé par le patient</span> : d.shared ? <span className="lock"><Icon name="globe" size={11} />Portail</span> : null}</div><div className="meta"><b className="truncate">{d.title}</b><div className="xs muted truncate">{withPatient && d.patient ? pname(d.patient) + ' · ' : ''}{fmt.date(d.date)} · {CAT[d.cat] ? CAT[d.cat][0] : 'Document'}</div></div></div>)}</div></div>);
}

export function Viewer({ doc, siblings = [], onClose, onSwitch }) {
  const act = useAction(); const run = useRun();
  const [z, setZ] = useState(1); const [rot, setRot] = useState(0); const [br, setBr] = useState(100); const [ct, setCt] = useState(100); const [inv, setInv] = useState(false); const [tx, setTx] = useState([0, 0]);
  const drag = useRef(null);
  const reset = () => { setZ(1); setRot(0); setBr(100); setCt(100); setInv(false); setTx([0, 0]); };
  const isPdf = doc.mime === 'application/pdf' && doc.filePath;
  return <Modal title={doc.title} size="xl" onClose={onClose} footer={<>{isPdf && <a className="btn" href={`/api/documents/${doc.id}/file`} target="_blank" rel="noreferrer"><Icon name="download" />Ouvrir le PDF</a>}<button className="btn" onClick={() => run(() => act(() => patch(`/documents/${doc.id}`, { shared: !doc.shared })), doc.shared ? 'Partage retiré' : 'Visible dans l’espace patient', 'globe').then(onClose).catch(() => { })}><Icon name="globe" />{doc.shared ? 'Retirer du portail' : 'Partager au patient'}</button><button className="btn primary" onClick={onClose}>Fermer</button></>}>
    <div className="row between wrap mb-12"><div className="small"><b>{doc.patient ? pname(doc.patient) : ''}</b> <span className="muted">· {fmt.dateLong(doc.date)}{doc.consult ? ' · ' + doc.consult : ''}</span></div><div className="row gap-6"><Badge label={CAT[doc.cat] ? CAT[doc.cat][0] : 'Document'} cls="tone-blue" dot={false} /><Badge label="Chiffré" cls="tone-green" dot={false} /></div></div>
    <div className="viewer" onWheel={e => setZ(v => Math.min(5, Math.max(0.5, v * (e.deltaY < 0 ? 1.1 : 0.9))))}
      onPointerDown={e => { drag.current = [e.clientX - tx[0], e.clientY - tx[1]]; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => drag.current && setTx([e.clientX - drag.current[0], e.clientY - drag.current[1]])} onPointerUp={() => { drag.current = null; }}>
      <div className="stage" style={{ transform: `translate(${tx[0]}px,${tx[1]}px) scale(${z}) rotate(${rot}deg)`, filter: `brightness(${br}%) contrast(${ct}%) ${inv ? 'invert(1)' : ''}`, transition: drag.current ? 'none' : undefined }}><Media doc={doc} /></div>
    </div>
    <div className="viewer-tools">
      <button className="btn sm icon" title="Zoom +" onClick={() => setZ(v => Math.min(5, v * 1.25))}><Icon name="zoomIn" /></button><button className="btn sm icon" title="Zoom −" onClick={() => setZ(v => Math.max(0.5, v * 0.8))}><Icon name="zoomOut" /></button>
      <button className="btn sm icon" title="Rotation" onClick={() => setRot(r => r + 90)}><Icon name="refresh" /></button><button className="btn sm" onClick={() => setInv(v => !v)}><Icon name="contrast" />Inverser</button><button className="btn sm" onClick={reset}>Réinitialiser</button>
      <label className="row small muted gap-6">Luminosité <input type="range" min="40" max="180" value={br} onChange={e => setBr(e.target.value)} /></label><label className="row small muted gap-6">Contraste <input type="range" min="40" max="220" value={ct} onChange={e => setCt(e.target.value)} /></label>
    </div>
    {siblings.length > 1 && <div className="row gap-6 mt-16" style={{ overflowX: 'auto', paddingBottom: 4 }}>{siblings.map(x => <div key={x.id} className="media" style={{ width: 120, flex: 'none', outline: x.id === doc.id ? '2px solid var(--primary)' : 'none' }} onClick={() => { reset(); onSwitch(x); }}><div className="thumb" style={{ aspectRatio: '4/3' }}><Media doc={x} /></div></div>)}</div>}
  </Modal>;
}

export function BeforeAfter({ before, after, labels = ['Avant', 'Après'], style }) {
  const [p, setP] = useState(50); const on = useRef(false); const box = useRef(null);
  const set = x => { const r = box.current.getBoundingClientRect(); setP(Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100))); };
  return <div className="ba" ref={box} style={style} onPointerDown={e => { on.current = true; e.currentTarget.setPointerCapture(e.pointerId); set(e.clientX); }} onPointerMove={e => on.current && set(e.clientX)} onPointerUp={() => { on.current = false; }}>
    <div className="ba-img" dangerouslySetInnerHTML={{ __html: before }} /><div className="ba-img ba-after" style={{ clipPath: `inset(0 0 0 ${p}%)` }} dangerouslySetInnerHTML={{ __html: after }} />
    <div className="ba-handle" style={{ left: p + '%' }} /><span className="ba-lab" style={{ left: 12 }}>{labels[0]}</span><span className="ba-lab" style={{ right: 12 }}>{labels[1]}</span>
  </div>;
}

const VIS = { praticiens: 'Praticiens uniquement', equipe: 'Équipe clinique', patient: 'Partagé avec le patient' };
export function BACard({ b, withPatient }) {
  const { can } = useAuth(); const act = useAction(); const run = useRun(); const seed = +String(b.id).replace(/\D/g, '') || 3;
  return <div className="card"><div className="card-body">
    <div className="row between mb-12"><div><b>{b.title}</b><div className="xs muted">{withPatient && b.patient ? pname(b.patient) + ' · ' : ''}{b.cat} · {fmt.date(b.before)}{b.after ? ' → ' + fmt.date(b.after) : ' → projet'}</div></div><span className="badge tone-gold"><Icon name="lock" size={11} />{VIS[b.visibility]}</span></div>
    <BeforeAfter before={smile(b.shade[0], seed, b.crowd)} after={smile(b.shade[1], seed, false)} labels={['Avant', b.after ? 'Après' : 'Simulation']} />
    <div className="row between mt-12 wrap" style={{ gap: 8 }}><span className="xs" style={b.consent ? { color: 'var(--muted)' } : { color: 'var(--danger)' }}>{b.consent ? '✓ Consentement photo recueilli' : '⚠ Consentement photo manquant — usage interne uniquement'}</span>
      <select className="select sm" style={{ width: 210 }} disabled={!can('images.private')} value={b.visibility} onChange={e => run(() => act(() => patch(`/before-after/${b.id}`, { visibility: e.target.value })), 'Visibilité : ' + VIS[e.target.value], 'lock').catch(() => { })}>{Object.entries(VIS).map(([k, v]) => <option key={k} value={k} disabled={k === 'patient' && !b.consent}>{v}</option>)}</select></div>
  </div></div>;
}

export function UploadZone({ patientId, disabledText }) {
  const act = useAction(); const run = useRun(); const [drag, setDrag] = useState(false); const inp = useRef(null);
  const send = files => { if (!patientId) return run(() => Promise.reject(new Error(disabledText || 'Choisissez d’abord un patient'))).catch(() => { }); const fd = new FormData(); fd.append('patientId', patientId); [...files].forEach(f => fd.append('files', f)); return run(() => act(() => upload('/documents', fd)), r => `${r.length} fichier(s) ajouté(s) au dossier`, 'upload').catch(() => { }); };
  return <label className={cx('upload', drag && 'drag')} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); send(e.dataTransfer.files); }}>
    <Icon name="upload" size={26} style={{ margin: '0 auto 6px' }} /><b>Déposer des radiographies, photos ou PDF</b><div className="xs">ou cliquez pour parcourir · JPG, PNG, WEBP, PDF · 15 Mo max · stockage sécurisé</div>
    <input ref={inp} type="file" multiple accept="image/*,application/pdf" hidden onChange={e => { send(e.target.files); e.target.value = ''; }} />
  </label>;
}

export function GroupSwitch({ value, onChange }) { return <Segmented value={value} onChange={onChange} options={[['date', 'Par date'], ['type', 'Par type'], ['consult', 'Par consultation']]} />; }
