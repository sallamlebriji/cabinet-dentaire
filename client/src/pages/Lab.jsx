import { useState } from 'react';
import { Link } from 'react-router-dom';
import { patch, post, useAction, useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { PatientPicker } from '../components/Modals';
import { Async, Card, Field, Icon, Kpi, MapBadge, Modal, PageHead, Tabs, useRun, cx } from '../ui';
import { D, fmt, pname, sname, LAB_ST, LAB_ORDER } from '../lib/format';

export default function Lab() {
  const { can } = useAuth(); const act = useAction(); const run = useRun();
  const [tab, setTab] = useState('suivi'); const [drag, setDrag] = useState(null); const [over, setOver] = useState(null); const [open, setOpen] = useState(null); const [create, setCreate] = useState(false);
  const cases = useGet('/lab-cases'); const labs = useGet('/labs');
  const setStatus = (l, s) => run(() => act(() => patch(`/lab-cases/${l.id}`, { status: s })), `${l.type} : ${LAB_ST[s][0]}`, 'flask').catch(() => { });
  const t = D.today();
  return <>
    <PageHead title="Laboratoire dentaire" sub="À envoyer → Envoyé → En fabrication → Prêt → Reçu → Livré au patient" actions={can('lab.manage') && <button className="btn primary" onClick={() => setCreate(true)}><Icon name="plus" />Nouveau travail</button>} />
    <Async q={cases}>{all => { const late = all.filter(l => !['recu', 'livre'].includes(l.status) && l.due < t); const labName = id => ((labs.data || []).find(x => x.id === id) || {}).name || '';
      return <>
        <div className="grid g4 mb-16"><Kpi label="Travaux en cours" value={all.filter(l => l.status !== 'livre').length} icon="flask" tone="tone-gold" /><Kpi label="Prêts au labo" value={all.filter(l => l.status === 'pret').length} icon="bell" tone="tone-teal" /><Kpi label="En retard" value={late.length} icon="alert" tone="tone-red" foot={late.length > 0 && <span className="truncate">{late.map(l => pname(l.patient)).join(', ')}</span>} /><Kpi label="Coût labo (30 j)" value={fmt.money(all.filter(l => l.sent && l.sent >= D.add(t, -30)).reduce((s, l) => s + l.price, 0))} icon="wallet" tone="tone-navy" /></div>
        <div className="mb-16"><Tabs value={tab} onChange={setTab} tabs={[{ key: 'suivi', label: 'Suivi des travaux' }, { key: 'labs', label: 'Laboratoires partenaires' }]} /></div>
        {tab === 'suivi' ? <div className="kanban">{LAB_ORDER.map(s => { const items = all.filter(l => l.status === s); return <div key={s} className={cx('kcol', over === s && 'drop')} onDragOver={e => { if (drag) { e.preventDefault(); setOver(s); } }} onDragLeave={() => setOver(null)} onDrop={e => { e.preventDefault(); setOver(null); if (drag && drag.status !== s) setStatus(drag, s); setDrag(null); }}>
          <div className="kcol-head"><MapBadge map={LAB_ST} value={s} /><span className="n">{items.length}</span></div>
          {items.map(l => { const lt = !['recu', 'livre'].includes(l.status) && l.due < t; return <div key={l.id} className={cx('kcard', drag && drag.id === l.id && 'dragging')} draggable={can('lab.manage')} onDragStart={() => setDrag(l)} onDragEnd={() => setDrag(null)} onClick={() => setOpen(l)}>
            <div className="row between"><b style={{ fontSize: 13 }}>{l.type}</b>{l.shade && l.shade !== '—' && <span className="tag">{l.shade}</span>}</div>
            <div className="small muted mt-4">{l.teeth} · {pname(l.patient)}</div>
            <div className="row between mt-12 xs"><span className="muted truncate" style={{ maxWidth: 130 }}><Icon name="flask" size={12} style={{ display: 'inline', verticalAlign: -2 }} /> {labName(l.labId)}</span><span style={lt ? { color: 'var(--danger)', fontWeight: 600 } : { color: 'var(--muted)' }}>{lt ? '⚠ ' : ''}{l.status === 'livre' ? 'Livré' : 'Retour ' + fmt.rel(l.due)}</span></div>
            {l.status === 'fabrication' && can('lab.manage') && <button className="btn xs mt-8" style={{ width: '100%' }} onClick={e => { e.stopPropagation(); setStatus(l, 'pret'); }}><Icon name="bell" />Le labo signale « prêt »</button>}
          </div>; })}
        </div>; })}</div>
          : <div className="grid g3">{(labs.data || []).map(l => <Card key={l.id}><div className="row"><span className="avatar" style={{ background: 'var(--gold-50)', color: 'var(--gold)' }}><Icon name="flask" size={16} /></span><div><b>{l.name}</b><div className="xs muted">{l.city} · délai moyen {l.delay} j</div></div></div>
            <div className="chips mt-12">{l.specialties.map(x => <span key={x} className="tag">{x}</span>)}</div><div className="divider" />
            <dl className="kv" style={{ gridTemplateColumns: '110px 1fr' }}><dt>Contact</dt><dd>{l.contact}</dd><dt>Téléphone</dt><dd>{l.phone}</dd><dt>Email</dt><dd className="truncate">{l.email}</dd><dt>Travaux</dt><dd>{l.total} ({l.active} en cours)</dd><dt>Ponctualité</dt><dd>{l.onTime == null ? '—' : l.onTime + ' %'}</dd></dl></Card>)}</div>}
      </>; }}</Async>
    {open && <CaseDrawer l={open} labs={labs.data || []} onClose={() => setOpen(null)} onStatus={s => { setStatus(open, s); setOpen(null); }} />}
    {create && <NewCase labs={labs.data || []} onClose={() => setCreate(false)} />}
  </>;
}

function CaseDrawer({ l, labs, onClose, onStatus }) {
  const { can, staff } = useAuth(); const act = useAction(); const run = useRun(); const [notes, setNotes] = useState(l.notes || ''); const lab = labs.find(x => x.id === l.labId) || {}; const ci = LAB_ORDER.indexOf(l.status);
  return <Modal title={`${l.type} · ${l.teeth}`} drawer onClose={onClose} footer={<><Link className="btn" to={`/app/patients/${l.patientId}`} onClick={onClose}><Icon name="user" />Fiche</Link>{can('lab.manage') && <button className="btn primary" onClick={() => run(() => act(() => patch(`/lab-cases/${l.id}`, { notes })), 'Travail mis à jour').then(onClose).catch(() => { })}>Enregistrer</button>}</>}>
    <b>{pname(l.patient)}</b><div className="small muted">{l.patient && l.patient.phone}</div>
    <div className="mt-16 row" style={{ gap: 0, overflowX: 'auto' }}>{LAB_ORDER.map((s, i) => <span key={s} style={{ display: 'contents' }}>{i > 0 && <div className={cx('pipe-line', i <= ci && 'done')} style={{ width: 12 }} />}<span className={cx('pipe', i < ci && 'done', i === ci && 'cur')}><span className="d">{i < ci ? '✓' : i + 1}</span></span></span>)}</div>
    <div className="small mt-8"><b>{LAB_ST[l.status][0]}</b></div>
    <div className="card mt-16"><div className="card-body"><dl className="kv" style={{ gridTemplateColumns: '120px 1fr' }}><dt>Laboratoire</dt><dd>{lab.name}<div className="xs muted">{lab.phone} · {lab.email}</div></dd><dt>Praticien</dt><dd>{sname(staff(l.dentistId))}</dd><dt>Teinte</dt><dd>{l.shade}</dd><dt>Envoyé le</dt><dd>{l.sent ? fmt.date(l.sent) : '—'}</dd><dt>Retour prévu</dt><dd>{fmt.date(l.due)}</dd><dt>Reçu le</dt><dd>{l.received ? fmt.date(l.received) : '—'}</dd><dt>Coût labo</dt><dd>{fmt.money(l.price)}</dd></dl></div></div>
    <Field label="Instructions / notes" style={{ marginTop: 16 }}><textarea className="textarea" value={notes} onChange={e => setNotes(e.target.value)} /></Field>
    {can('lab.manage') && <><div className="small muted mt-16 mb-8">Changer le statut</div><div className="row wrap gap-6">{LAB_ORDER.map(s => <button key={s} className={cx('btn sm', l.status === s && 'navy')} onClick={() => onStatus(s)}>{LAB_ST[s][0]}</button>)}</div></>}
  </Modal>;
}
function NewCase({ labs, onClose }) {
  const act = useAction(); const run = useRun();
  const [f, setF] = useState({ patientId: '', type: 'Couronne zircone', labId: labs[0] && labs[0].id, teeth: '', shade: '', imp: 'Empreinte optique (STL)', due: D.add(D.today(), 8), price: 1200, notes: '', send: true });
  const b = k => ({ value: f[k], onChange: e => setF(s => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })) });
  return <Modal title="Nouveau travail de laboratoire" size="lg" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" disabled={!f.patientId} onClick={() => run(() => act(() => post('/lab-cases', { ...f, price: +f.price, notes: f.imp + (f.notes ? ' — ' + f.notes : '') })), 'Travail créé' + (f.send ? ' et envoyé au laboratoire' : ''), 'flask').then(onClose).catch(() => { })}>Créer</button></>}>
    <div className="form-grid"><Field label="Patient" full><PatientPicker value={f.patientId} onChange={v => setF(s => ({ ...s, patientId: v }))} autoFocus /></Field>
      <Field label="Type de travail"><select className="select" {...b('type')}>{['Couronne zircone', 'Couronne céramo-métallique', 'Bridge 3 éléments', 'Facettes céramiques', 'Inlay-core', 'Prothèse amovible partielle', 'Prothèse complète', 'Appareil orthodontique', 'Aligneurs', 'Gouttière occlusale', 'Gouttière de contention', 'Empreinte / modèle d’étude'].map(x => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Laboratoire"><select className="select" {...b('labId')}>{labs.map(l => <option key={l.id} value={l.id}>{l.name} ({l.delay} j)</option>)}</select></Field>
      <Field label="Dent(s)"><input className="input" placeholder="Ex. : 36" {...b('teeth')} /></Field><Field label="Teinte"><input className="input" placeholder="Ex. : A2" {...b('shade')} /></Field>
      <Field label="Empreinte"><select className="select" {...b('imp')}><option>Empreinte optique (STL)</option><option>Empreinte physique (silicone)</option><option>Alginate</option></select></Field>
      <Field label="Retour souhaité"><input className="input" type="date" {...b('due')} /></Field><Field label="Coût (DH)"><input className="input" type="number" {...b('price')} /></Field>
      <Field label="Instructions" full><textarea className="textarea" {...b('notes')} /></Field>
      <label className="check full"><input type="checkbox" checked={f.send} onChange={b('send').onChange} /> Envoyer immédiatement au laboratoire</label></div>
  </Modal>;
}
