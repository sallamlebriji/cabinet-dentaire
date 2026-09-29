/* Modales transverses : rendez-vous, patient, encaissement — ouvertes depuis n'importe quelle page */
import { createContext, useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { get, post, patch, useAction, useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { Avatar, Badge, Field, Icon, Modal, StatusBadge, useRun, useUI, cx } from '../ui';
import { D, fmt, pname, sname, age, METHOD, INV_ST } from '../lib/format';

const Ctx = createContext(null);
export const useActions = () => useContext(Ctx);

export function ActionsProvider({ children }) {
  const [m, setM] = useState(null);
  const close = () => setM(null);
  const value = {
    newAppt: (pre = {}) => setM({ k: 'appt', pre }), appt: id => setM({ k: 'drawer', id }),
    newPatient: after => setM({ k: 'patient', after }), pay: (pre = {}) => setM({ k: 'pay', pre })
  };
  return <Ctx.Provider value={value}>
    {children}
    {m && m.k === 'appt' && <ApptModal pre={m.pre} onClose={close} onNewPatient={() => setM({ k: 'patient', after: p => setM({ k: 'appt', pre: { ...m.pre, patientId: p.id } }) })} />}
    {m && m.k === 'drawer' && <ApptDrawer id={m.id} onClose={close} />}
    {m && m.k === 'patient' && <PatientModal onClose={close} after={m.after} />}
    {m && m.k === 'pay' && <PaymentModal pre={m.pre} onClose={close} />}
  </Ctx.Provider>;
}

/** Sélecteur de patient avec recherche serveur */
export function PatientPicker({ value, onChange, autoFocus }) {
  const [q, setQ] = useState(''); const [open, setOpen] = useState(false);
  const cur = useGet(value ? `/patients/${value}` : null, { log: '0' });
  const list = useGet('/patients', { q, limit: 12 }, { enabled: open });
  const p = cur.data && cur.data.patient;
  return <div style={{ position: 'relative' }}>
    <input className="input" autoFocus={autoFocus} placeholder="Rechercher un patient (nom, téléphone, n° de dossier)…" value={open ? q : p ? `${p.last} ${p.first} · ${p.fileNo}` : q} onFocus={() => { setOpen(true); setQ(''); }} onBlur={() => setTimeout(() => setOpen(false), 150)} onChange={e => setQ(e.target.value)} />
    {open && <div className="search-results" style={{ top: 42 }}>{(list.data || []).map(x => <div key={x.id} className="sr-item" onMouseDown={() => { onChange(x.id); setOpen(false); }}><Avatar p={x} size="sm" /><div className="grow"><div style={{ fontWeight: 500 }}>{x.last} {x.first}</div><div className="xs muted">{x.fileNo} · {x.phone}</div></div>{x.allergies.length > 0 && <span className="tag allergy">Allergie</span>}</div>)}{list.data && !list.data.length && <div className="empty small">Aucun patient</div>}</div>}
  </div>;
}

export function ApptModal({ pre, onClose, onNewPatient }) {
  const { types, dentists, staff, clinicById, me } = useAuth(); const act = useAction(); const run = useRun();
  const defDn = pre.dentistId || (me.user.role === 'dentiste' ? me.user.id : dentists[0] && dentists[0].id);
  const [f, setF] = useState({ patientId: pre.patientId || '', type: pre.type || 'consultation', dentistId: defDn, date: pre.date || D.today(), start: pre.start || '10:00', dur: types[pre.type || 'consultation'].dur, chair: pre.chair || '', status: 'attente', note: pre.note || '', notify: true });
  const [conflict, setConflict] = useState(undefined);
  const set = (k, v) => setF(s => ({ ...s, [k]: v, ...(k === 'type' ? { dur: types[v].dur } : {}) }));
  const dn = staff(f.dentistId); const chairs = dn ? clinicById(dn.clinicId).chairs : [];
  useEffect(() => { if (!f.dentistId || !f.date || !f.start) return; const t = setTimeout(() => get('/appointments/check', { dentistId: f.dentistId, date: f.date, start: f.start, dur: f.dur }).then(r => setConflict(r.conflict)).catch(() => { }), 250); return () => clearTimeout(t); }, [f.dentistId, f.date, f.start, f.dur]);
  const save = () => run(() => act(() => post('/appointments', { ...f, chair: f.chair || (dn && dn.chair) })), `Rendez-vous créé — ${fmt.dayMonth(f.date)} à ${fmt.hShort(f.start)}`, 'calendar').then(onClose).catch(() => { });
  return <Modal title="Nouveau rendez-vous" size="lg" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" disabled={!f.patientId} onClick={save}><Icon name="check" />Créer le rendez-vous</button></>}>
    <div className="form-grid">
      <Field label="Patient" full><div className="row"><div className="grow"><PatientPicker value={f.patientId} onChange={v => set('patientId', v)} autoFocus={!f.patientId} /></div><button type="button" className="btn" onClick={onNewPatient}><Icon name="plus" />Nouveau</button></div></Field>
      <Field label="Type de rendez-vous"><select className="select" value={f.type} onChange={e => set('type', e.target.value)}>{Object.entries(types).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}</select></Field>
      <Field label="Praticien"><select className="select" value={f.dentistId} onChange={e => set('dentistId', e.target.value)}>{dentists.map(d => <option key={d.id} value={d.id}>{sname(d)}</option>)}</select></Field>
      <Field label="Date"><input className="input" type="date" value={f.date} onChange={e => set('date', e.target.value)} /></Field>
      <div className="row" style={{ gap: 10 }}><Field label="Heure" style={{ flex: 1 }}><input className="input" type="time" step="900" value={f.start} onChange={e => set('start', e.target.value)} /></Field><Field label="Durée (min)" style={{ width: 110 }}><input className="input" type="number" step="5" min="10" value={f.dur} onChange={e => set('dur', +e.target.value)} /></Field></div>
      <Field label="Fauteuil"><select className="select" value={f.chair || (dn && dn.chair) || ''} onChange={e => set('chair', e.target.value)}>{chairs.map(c => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Statut"><select className="select" value={f.status} onChange={e => set('status', e.target.value)}><option value="confirme">Confirmé</option><option value="attente">En attente de confirmation</option></select></Field>
      <Field label="Note" full><input className="input" value={f.note} placeholder="Ex. : apporter les radiographies, patient anxieux…" onChange={e => set('note', e.target.value)} /></Field>
      <div className="full row wrap" style={{ gap: 16 }}><label className="check"><input type="checkbox" checked={f.notify} onChange={e => set('notify', e.target.checked)} /> Envoyer la confirmation au patient</label>
        {conflict !== undefined && <span className="xs">{conflict ? <span style={{ color: 'var(--danger)' }}>⚠ Chevauchement avec {conflict.patient} à {conflict.start}</span> : <span style={{ color: 'var(--success)' }}>✓ Créneau disponible</span>}</span>}</div>
    </div>
  </Modal>;
}

export function ApptDrawer({ id, onClose }) {
  const { types, staff, clinicById, can } = useAuth(); const act = useAction(); const run = useRun();
  const [a, setA] = useState(null); const [note, setNote] = useState(''); const [rd, setRd] = useState(''); const [rt, setRt] = useState('');
  useEffect(() => { let alive = true; get(`/appointments/${id}`).then(x => { if (alive) { setA(x); setNote(x.note || ''); setRd(x.date); setRt(x.start); } }).catch(() => onClose()); return () => { alive = false; }; }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!a) return <Modal title="Rendez-vous" drawer onClose={onClose}><div className="empty">Chargement…</div></Modal>;
  const p = a.patient; const d = staff(a.dentistId); const t = types[a.type]; const canM = can('agenda.manage');
  const status = s => run(() => act(() => post(`/appointments/${a.id}/status`, { status: s })), r => (r.invoice ? `Séance terminée · facture ${r.invoice.number} générée` : 'Statut mis à jour'), 'check').then(r => setA(x => ({ ...x, status: r.appointment.status }))).catch(() => { });
  const move = () => run(() => act(() => patch(`/appointments/${a.id}`, { date: rd, start: rt })), 'Rendez-vous reprogrammé · patient notifié', 'repeat').then(onClose).catch(() => { });
  const remind = () => run(() => post(`/appointments/${a.id}/remind`), r => `Rappel envoyé par ${r.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}`, 'send').catch(() => { });
  const saveNote = () => run(() => act(() => patch(`/appointments/${a.id}`, { note })), 'Note enregistrée').then(onClose).catch(() => { });
  return <Modal title="Rendez-vous" drawer onClose={onClose} footer={<><Link className="btn" to={`/app/patients/${p.id}`} onClick={onClose}><Icon name="user" />Fiche</Link>{can('comm.send') && <button className="btn" onClick={remind}><Icon name="send" />Rappel</button>}{canM && <button className="btn primary" onClick={saveNote}><Icon name="check" />Enregistrer</button>}</>}>
    <div className="row" style={{ gap: 14 }}><Avatar p={p} size="lg" /><div className="grow"><Link to={`/app/patients/${p.id}`} onClick={onClose} style={{ fontSize: 18, fontWeight: 600, color: 'var(--navy)' }}>{pname(p)}</Link><div className="small muted">{age(p.dob)} ans · {p.phone} · {p.fileNo}</div>
      <div className="row wrap gap-6 mt-8"><StatusBadge status={a.status} />{a.source === 'online' && <Badge label="Réservé en ligne" cls="tone-teal" dot={false} />}{a.moved && <Badge label="Reprogrammé" cls="tone-violet" dot={false} />}{p.noShows >= 2 && <Badge label={`${p.noShows} no-show`} cls="st-noshow" dot={false} />}</div></div></div>
    {p.allergies.length > 0 && <div className="med-alert mt-16"><Icon name="alert" /><div><b>Allergies déclarées :</b> {p.allergies.join(', ')}</div></div>}
    <div className="card mt-16" style={{ borderLeft: `3px solid ${t.color}` }}><div className="card-body" style={{ padding: '14px 16px' }}><dl className="kv">
      <dt>Type</dt><dd><span className="row gap-6"><i style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, display: 'inline-block' }} />{t.label}</span></dd>
      <dt>Date</dt><dd>{fmt.dateLong(a.date)}</dd><dt>Horaire</dt><dd>{a.start} – {D.hm(D.min(a.start) + a.dur)} ({a.dur} min)</dd>
      <dt>Praticien</dt><dd>{sname(d)}</dd><dt>Salle</dt><dd>{clinicById(a.clinicId).name} · {a.chair}</dd>{a.late > 0 && <><dt>Retard</dt><dd>{a.late} min</dd></>}
      {a.invoice && <><dt>Facture</dt><dd><Link to={`/app/facturation/${a.invoice.id}`} onClick={onClose}>{a.invoice.number}</Link></dd></>}
    </dl></div></div>
    {canM && <><div className="mt-16"><div className="small muted mb-8">Changer le statut</div><div className="row wrap gap-6">
      {[['confirme', 'check', 'Confirmer'], ['encours', 'activity', 'Démarrer'], ['termine', 'check', 'Terminer'], ['noshow', 'x', 'No-show'], ['annule', 'x', 'Annuler']].map(([s, ic, l]) => <button key={s} className={cx('btn sm', a.status === s && 'navy', ['annule', 'noshow'].includes(s) && a.status !== s && 'danger')} onClick={() => status(s)}><Icon name={ic} />{l}</button>)}
    </div></div>
      <div className="mt-16"><div className="small muted mb-8">Reprogrammer</div><div className="row wrap"><input className="input sm" type="date" value={rd} onChange={e => setRd(e.target.value)} style={{ width: 160 }} /><input className="input sm" type="time" step="900" value={rt} onChange={e => setRt(e.target.value)} style={{ width: 110 }} /><button className="btn sm" onClick={move}><Icon name="repeat" />Déplacer</button></div></div></>}
    <Field label="Note" style={{ marginTop: 16 }}><textarea className="textarea" readOnly={!canM} value={note} onChange={e => setNote(e.target.value)} placeholder="Ajouter une note…" /></Field>
  </Modal>;
}

export function PatientModal({ onClose, after }) {
  const { meta, clinic, me, allDentists } = useAuth(); const act = useAction(); const run = useRun(); const nav = useNavigate();
  const [f, setF] = useState({ first: '', last: '', dob: '1990-01-01', sex: 'F', phone: '', email: '', address: '', profession: '', cover: 'CNOPS', emName: '', emPhone: '', clinicId: clinic === 'all' ? me.allowedClinics[0] : clinic, dentistId: '', allergies: '', history: '', meds: '', sms: true });
  const b = k => ({ value: f[k], onChange: e => setF(s => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })) });
  const dn = allDentists.filter(d => d.clinicId === f.clinicId);
  const save = () => run(() => act(() => post('/patients', { ...f, dentistId: f.dentistId || (dn[0] && dn[0].id), emergency: { name: f.emName, phone: f.emPhone }, consent: { sms: f.sms, whatsapp: f.sms } })), p => `Fiche créée — ${pname(p)}`, 'user').then(p => { onClose(); if (after) after(p); else nav(`/app/patients/${p.id}`); }).catch(() => { });
  return <Modal title="Nouveau patient" size="lg" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" onClick={save}><Icon name="check" />Créer la fiche</button></>}>
    <div className="form-grid">
      <Field label="Prénom *"><input className="input" autoFocus {...b('first')} /></Field><Field label="Nom *"><input className="input" {...b('last')} /></Field>
      <Field label="Date de naissance"><input className="input" type="date" {...b('dob')} /></Field><Field label="Sexe"><select className="select" {...b('sex')}><option value="F">Femme</option><option value="M">Homme</option></select></Field>
      <Field label="Téléphone *"><input className="input" placeholder="06 00 00 00 00" {...b('phone')} /></Field><Field label="Email"><input className="input" type="email" {...b('email')} /></Field>
      <Field label="Adresse" full><input className="input" {...b('address')} /></Field>
      <Field label="Profession"><input className="input" {...b('profession')} /></Field><Field label="Couverture"><select className="select" {...b('cover')}>{['CNOPS', 'CNSS (AMO)', 'Mutuelle privée', 'Assurance privée', 'Sans couverture'].map(c => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Contact d’urgence"><input className="input" placeholder="Nom" {...b('emName')} /></Field><Field label="Téléphone d’urgence"><input className="input" {...b('emPhone')} /></Field>
      <Field label="Cabinet"><select className="select" {...b('clinicId')}>{meta.clinics.filter(c => me.allowedClinics.includes(c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="Praticien référent"><select className="select" {...b('dentistId')}>{dn.map(d => <option key={d.id} value={d.id}>{sname(d)}</option>)}</select></Field>
      <Field label="Allergies déclarées" full><input className="input" placeholder="Séparées par des virgules (ex. : Pénicilline, Latex)" {...b('allergies')} /></Field>
      <Field label="Antécédents renseignés" full><input className="input" placeholder="Séparés par des virgules" {...b('history')} /></Field>
      <Field label="Médicaments déclarés" full><input className="input" placeholder="Séparés par des virgules" {...b('meds')} /></Field>
      <label className="check full"><input type="checkbox" checked={f.sms} onChange={b('sms').onChange} /> Accepte les rappels SMS / WhatsApp</label>
    </div>
  </Modal>;
}

export function PaymentModal({ pre, onClose }) {
  const act = useAction(); const run = useRun();
  const [pid, setPid] = useState(pre.patientId || ''); const [inv, setInv] = useState(pre.invoiceId || '');
  const [kind, setKind] = useState('paiement'); const [method, setMethod] = useState('especes'); const [amount, setAmount] = useState(''); const [ref, setRef] = useState('');
  const fin = useGet(pid ? `/patients/${pid}/finances` : null);
  const invoices = fin.data ? fin.data.invoices : []; const open = invoices.filter(i => i.due > 0); const shown = open.length ? open : invoices.slice(0, 5);
  useEffect(() => { if (!fin.data) return; const i = invoices.find(x => x.id === inv) || open[0]; if (i) { setInv(i.id); setAmount(Math.max(0, i.due)); } else setInv(''); }, [fin.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const bal = fin.data && fin.data.balance;
  const save = () => run(() => act(() => post('/payments', { patientId: pid, invoiceId: inv || null, amount: +amount, method, kind, ref })), `${kind === 'remboursement' ? 'Remboursement' : 'Paiement'} de ${fmt.money(amount)} enregistré`, 'card').then(onClose).catch(() => { });
  return <Modal title="Enregistrer un paiement" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" disabled={!pid || !amount} onClick={save}><Icon name="check" />Enregistrer</button></>}>
    <div className="form-grid">
      <Field label="Patient" full><PatientPicker value={pid} onChange={v => { setPid(v); setInv(''); }} autoFocus={!pid} /></Field>
      <Field label="Facture" full><select className="select" value={inv} onChange={e => { setInv(e.target.value); const i = invoices.find(x => x.id === e.target.value); if (i) setAmount(i.due); }}>{shown.map(i => <option key={i.id} value={i.id}>{i.number} · {fmt.date(i.date)} · reste {fmt.money(i.due)}</option>)}{!shown.length && <option value="">Aucune facture — paiement libre</option>}</select></Field>
      <Field label="Type"><select className="select" value={kind} onChange={e => setKind(e.target.value)}><option value="paiement">Paiement</option><option value="acompte">Acompte</option><option value="remboursement">Remboursement</option></select></Field>
      <Field label="Montant (DH)"><input className="input" type="number" min="0" step="50" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
      <Field label="Mode de paiement" full><div className="chips">{['especes', 'carte', 'virement', 'en_ligne', 'cheque'].map(k => <button type="button" key={k} className={cx('chip', method === k && 'on')} onClick={() => setMethod(k)}>{METHOD[k]}</button>)}</div></Field>
      <Field label="Référence / note" full><input className="input" value={ref} onChange={e => setRef(e.target.value)} placeholder="N° de transaction, commentaire…" /></Field>
      {bal && <div className="full card" style={{ background: 'var(--surface-2)' }}><div className="card-body row between" style={{ padding: '12px 16px' }}><div><div className="xs muted">Total facturé</div><b>{fmt.money(bal.total)}</b></div><div><div className="xs muted">Payé</div><b style={{ color: 'var(--success)' }}>{fmt.money(bal.paid)}</b></div><div><div className="xs muted">Reste à payer</div><b style={{ color: bal.due > 0 ? 'var(--danger)' : 'inherit' }}>{fmt.money(bal.due)}</b></div></div></div>}
    </div>
  </Modal>;
}

export { INV_ST };
