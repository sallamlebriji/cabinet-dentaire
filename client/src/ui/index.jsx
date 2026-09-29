/* Primitives d'interface : badges, avatars, modales, toasts, confirmations, menus, KPI… */
import { Component, createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { initials } from '../lib/format';

export { Icon };
export const cx = (...a) => a.filter(Boolean).join(' ');

export const STATUS = {
  confirme: ['Confirmé', 'st-confirme', '#2C6BCB'], attente: ['En attente', 'st-attente', '#D08A24'], encours: ['En cours', 'st-encours', '#3AA6A0'],
  termine: ['Terminé', 'st-termine', '#2E9C6E'], annule: ['Annulé', 'st-annule', '#9AA5B4'], noshow: ['No-show', 'st-noshow', '#CF4759']
};

export const Badge = ({ label, cls = '', dot = true, children, title }) => <span className={cx('badge', cls)} title={title}>{dot && <i className="b-dot" />}{label}{children}</span>;
export const StatusBadge = ({ status }) => { const s = STATUS[status]; return s ? <Badge label={s[0]} cls={s[1]} /> : null; };
export const MapBadge = ({ map, value }) => { const s = map[value]; return s ? <Badge label={s[0]} cls={s[1]} /> : null; };

export function Avatar({ p, size = '', style }) {
  if (!p) return null;
  return <span className={cx('avatar', size)} style={{ background: p.avatar || p.color || '#2C6BCB', ...style }}>{initials(p).toUpperCase()}</span>;
}

export const Empty = ({ text, icon = 'folder', children }) => <div className="empty"><Icon name={icon} /><div>{text}</div>{children}</div>;
export const Loading = ({ text = 'Chargement…' }) => <div className="empty"><div className="typing" style={{ marginBottom: 8 }}><i /><i /><i /></div><div className="small">{text}</div></div>;
export const ErrorBox = ({ error }) => <div className="med-alert"><Icon name="alert" /><div>{error ? error.message : 'Erreur'}</div></div>;
/** Affiche chargement / erreur / contenu d'une requête React Query */
export function Async({ q, children, loading }) {
  if (q.isLoading) return loading || <Loading />;
  if (q.isError) return <div className="card card-pad"><ErrorBox error={q.error} /></div>;
  return children(q.data);
}

export function PageHead({ title, sub, actions, crumbs }) {
  return <div className="page-head"><div>{crumbs && <div className="crumbs">{crumbs}</div>}<h1>{title}</h1>{sub && <div className="sub">{sub}</div>}</div>{actions && <div className="row wrap">{actions}</div>}</div>;
}
export const Delta = ({ v, suffix = '%' }) => <span className={cx('delta', v >= 0 ? 'up' : 'down')}><Icon name={v >= 0 ? 'arrowUp' : 'arrowDown'} size={12} />{String(Math.abs(Math.round(v * 10) / 10)).replace('.', ',')}{suffix}</span>;
export function Kpi({ label, value, icon, tone, foot, spark, className }) {
  return <div className={cx('card kpi', className)}>{spark && <div className="spark">{spark}</div>}<div className="label"><span className={cx('ico', tone)}><Icon name={icon} /></span>{label}</div><div className="value">{value}</div>{foot && <div className="foot">{foot}</div>}</div>;
}
export const Card = ({ title, sub, actions, children, className, bodyClass = 'card-body', style }) => (
  <div className={cx('card', className)} style={style}>
    {(title || actions) && <div className="card-head"><div>{title && <h3>{title}</h3>}{sub && <div className="sub">{sub}</div>}</div>{actions}</div>}
    <div className={bodyClass}>{children}</div>
  </div>
);
export const Field = ({ label, children, full, hint, style }) => <div className={cx('field', full && 'full')} style={style}>{label && <label>{label}</label>}{children}{hint && <span className="hint">{hint}</span>}</div>;
export const Switch = ({ checked, onChange, disabled }) => <label className="switch"><input type="checkbox" checked={!!checked} disabled={disabled} onChange={e => onChange(e.target.checked)} /><span /></label>;
export function Chips({ options, value, onChange, className }) {
  return <div className={cx('chips', className)}>{options.map(([k, l, dot]) => <button type="button" key={k} className={cx('chip', value === k && 'on')} onClick={() => onChange(k)}>{dot && <i className="sw" style={{ background: dot }} />}{l}</button>)}</div>;
}
export function Segmented({ options, value, onChange, style }) {
  return <div className="btn-group" style={style}>{options.map(([k, l]) => <button type="button" key={k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>{l}</button>)}</div>;
}
export function Tabs({ tabs, value, onChange }) {
  return <div className="tabs">{tabs.map(t => <button type="button" key={t.key} className={value === t.key ? 'on' : ''} onClick={() => onChange(t.key)} style={t.locked ? { opacity: .45 } : undefined}>{t.icon && <Icon name={t.icon} size={15} />}{t.label}{t.count ? <span className="n">{t.count}</span> : null}{t.locked && <Icon name="lock" size={12} />}</button>)}</div>;
}
export function Progress({ value, tone = '', height }) { return <div className={cx('progress', tone)} style={height ? { height } : undefined}><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>; }

/* ---------- Modale / tiroir ---------- */
export function Modal({ title, onClose, children, footer, size = '', drawer = false }) {
  useEffect(() => { const k = e => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [onClose]);
  return createPortal(
    <div className={cx('overlay', drawer && 'drawer')} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={cx('modal', size)} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
        <div className="modal-head"><h3>{title}</h3><button type="button" className="btn ghost icon sm" onClick={onClose} aria-label="Fermer"><Icon name="x" /></button></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>, document.body);
}

/* ---------- Toasts & confirmations ---------- */
const UICtx = createContext(null);
export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirm] = useState(null);
  const toast = useCallback((msg, icon = 'check') => { const id = Math.random(); setToasts(t => [...t, { id, msg, icon }]); setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3400); }, []);
  const confirm = useCallback((title, text, ok = 'Confirmer', danger = false) => new Promise(res => setConfirm({ title, text, ok, danger, res })), []);
  const close = v => { confirmState.res(v); setConfirm(null); };
  return <UICtx.Provider value={{ toast, confirm }}>
    {children}
    {createPortal(<div className="toasts">{toasts.map(t => <div key={t.id} className="toast"><span className="ti"><Icon name={t.icon} /></span><span>{t.msg}</span></div>)}</div>, document.body)}
    {confirmState && <Modal title={confirmState.title} onClose={() => close(false)} footer={<><button className="btn" onClick={() => close(false)}>Annuler</button><button className={cx('btn', confirmState.danger ? 'danger' : 'primary')} onClick={() => close(true)}>{confirmState.ok}</button></>}><p className="muted">{confirmState.text}</p></Modal>}
  </UICtx.Provider>;
}
export const useUI = () => useContext(UICtx);
/** Enveloppe une action asynchrone : toast de succès ou d'erreur */
export function useRun() {
  const { toast } = useUI();
  return useCallback(async (fn, success, icon) => { try { const r = await fn(); if (success) toast(typeof success === 'function' ? success(r) : success, icon); return r; } catch (e) { toast(e.message, 'alert'); throw e; } }, [toast]);
}

/* ---------- Menu déroulant ancré ---------- */
export function Dropdown({ anchor, onClose, children, align = 'left', className = '', minWidth }) {
  const ref = useRef(null); const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    if (!anchor) return; const r = anchor.getBoundingClientRect(); const w = ref.current ? ref.current.offsetWidth : 260;
    let left = align === 'right' ? r.right - w : r.left; left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    setPos({ left, top: r.bottom + 6 + window.scrollY });
  }, [anchor, align]);
  useEffect(() => { const h = e => { if (ref.current && !ref.current.contains(e.target) && !anchor.contains(e.target)) onClose(); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, [anchor, onClose]);
  return createPortal(<div ref={ref} className={cx('dropdown', className)} style={{ position: 'absolute', left: pos ? pos.left : -9999, top: pos ? pos.top : 0, minWidth }}>{children}</div>, document.body);
}

/** Empêche une erreur d'affichage de bloquer toute l'application */
export class ErrorBoundary extends Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    return <div className="card card-pad"><div className="med-alert"><Icon name="alert" /><div><b>Cette page a rencontré une erreur d’affichage.</b><br />{String(this.state.error.message || this.state.error)}</div></div><button className="btn mt-12" onClick={() => this.setState({ error: null })}>Réessayer</button></div>;
  }
}

/** Petit hook d'état de formulaire */
export function useForm(initial) {
  const [v, setV] = useState(initial);
  const bind = (k, type) => ({ name: k, value: v[k] ?? '', checked: type === 'checkbox' ? !!v[k] : undefined, onChange: e => { const t = e.target; setV(s => ({ ...s, [k]: t.type === 'checkbox' ? t.checked : t.type === 'number' ? (t.value === '' ? '' : +t.value) : t.value })); } });
  return [v, setV, bind];
}
