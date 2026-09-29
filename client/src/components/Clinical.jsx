import { useState } from 'react';
import { Link } from 'react-router-dom';
import { post, useAction, useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { Badge, Empty, Field, Icon, Modal, useRun } from '../ui';
import { PatientPicker } from './Modals';
import { RxDoc, printDoc } from '../lib/paper';
import { D, fmt, pname, sname } from '../lib/format';

export const SECS = [['motif', 'Motif de consultation'], ['anamnese', 'Anamnèse'], ['history', 'Antécédents'], ['allergies', 'Allergies déclarées'], ['observations', 'Observations'], ['diagnosis', 'Diagnostic'], ['proposed', 'Traitement proposé'], ['done', 'Traitement réalisé'], ['notes', 'Notes du praticien']];

export function ConsultCard({ c, withPatient, docs = [], rx = [] }) {
  const { staff, types } = useAuth();
  const dDocs = docs.filter(d => d.date === c.date); const dRx = rx.filter(r => r.date === c.date);
  return <div className="tl-card">
    <div className="row between wrap"><div><b style={{ fontSize: 14.5 }}>{c.motif}</b><div className="xs muted">{withPatient && c.patient ? pname(c.patient) + ' · ' : ''}{sname(staff(c.dentistId))}{c.type && types[c.type] ? ' · ' + types[c.type].label : ''}</div></div><div className="row gap-6">{dDocs.length > 0 && <Badge label={`${dDocs.length} document(s)`} cls="tone-blue" dot={false} />}{dRx.length > 0 && <Badge label="Ordonnance" cls="tone-violet" dot={false} />}</div></div>
    <div className="grid g2" style={{ gap: '4px 24px' }}>{SECS.slice(1).filter(([k]) => c[k]).map(([k, l]) => <div key={k} className="clin-sec"><h5>{l}</h5><p>{c[k]}</p></div>)}</div>
    {dDocs.length > 0 && <div className="row wrap gap-6 mt-12">{dDocs.map(d => <Link key={d.id} className="tag" to={`/app/radiographies?doc=${d.id}&patient=${d.patientId}`}><Icon name={d.cat === 'radio' ? 'scan' : d.cat === 'photo' ? 'image' : 'file'} size={12} style={{ marginRight: 4 }} />{d.title}</Link>)}</div>}
  </div>;
}

export function NewConsultModal({ patientId, onClose }) {
  const { types } = useAuth(); const act = useAction(); const run = useRun();
  const [pid, setPid] = useState(patientId || '');
  const p = useGet(pid ? `/patients/${pid}` : null, { log: '0' });
  const [f, setF] = useState({ date: D.today(), type: 'consultation' });
  const pat = p.data && p.data.patient;
  const val = k => f[k] ?? (k === 'history' && pat ? (pat.history || []).join(', ') : k === 'allergies' && pat ? pat.allergies.join(', ') : '');
  const set = k => e => setF(s => ({ ...s, [k]: e.target.value }));
  const save = () => run(() => act(() => post('/consultations', { patientId: pid, ...Object.fromEntries(SECS.map(([k]) => [k, val(k)])), date: f.date, type: f.type })), 'Consultation enregistrée dans le dossier', 'stethoscope').then(onClose).catch(() => { });
  return <Modal title="Nouvelle consultation" size="lg" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" disabled={!pid || !val('motif')} onClick={save}><Icon name="check" />Enregistrer la consultation</button></>}>
    <div className="form-grid">
      {!patientId && <Field label="Patient" full><PatientPicker value={pid} onChange={setPid} autoFocus /></Field>}
      <Field label="Date"><input className="input" type="date" value={f.date} onChange={set('date')} /></Field>
      <Field label="Type"><select className="select" value={f.type} onChange={set('type')}>{Object.entries(types).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}</select></Field>
      {SECS.map(([k, l]) => ['motif', 'history', 'allergies'].includes(k) ? <Field key={k} label={l}><input className="input" value={val(k)} onChange={set(k)} /></Field> : <Field key={k} label={l} full><textarea className="textarea" style={{ minHeight: 64 }} value={val(k)} onChange={set(k)} /></Field>)}
      <div className="full xs muted"><Icon name="shield" size={13} style={{ display: 'inline', verticalAlign: -2 }} /> Enregistrement horodaté, attribué au praticien connecté et tracé dans le journal d’audit.</div>
    </div>
  </Modal>;
}

/* ---------- Ordonnances ---------- */
const DRUGS = [['Paracétamol 1 g', '1 comprimé toutes les 6 heures si douleur (max. 4/jour)', '3 jours'], ['Ibuprofène 400 mg', '1 comprimé 3 fois par jour au cours des repas', '3 jours'], ['Amoxicilline 1 g', '1 comprimé matin et soir', '6 jours'], ['Clindamycine 300 mg', '2 gélules matin et soir', '7 jours'], ['Chlorhexidine 0,12 % bain de bouche', '2 bains de bouche par jour après brossage', '7 jours'], ['Gel gingival apaisant', '3 applications par jour', '5 jours']];
const PENI = /amoxi|p[ée]nicill|augmentin|ampicill/i;

export function RxModal({ patient, onClose }) {
  const { meta } = useAuth(); const act = useAction(); const run = useRun();
  const [items, setItems] = useState([]); const [notes, setNotes] = useState('');
  const upd = (k, key, v) => setItems(a => a.map((x, i) => (i === k ? { ...x, [key]: v } : x)));
  const pa = patient.allergies.some(a => /p[ée]nicill/i.test(a)); const hit = items.find(i => pa && PENI.test(i.drug));
  const nsaid = patient.allergies.some(a => /aspirine|ains/i.test(a)) && items.find(i => /ibupro|aspirine|kétopro/i.test(i.drug));
  const save = () => run(() => act(() => post('/prescriptions', { patientId: patient.id, items: items.filter(i => i.drug.trim()), notes })), 'Ordonnance enregistrée', 'pill').then(rx => { onClose(); printDoc(<RxDoc rx={rx} patient={patient} meta={meta} />); }).catch(() => { });
  return <Modal title={`Nouvelle ordonnance — ${pname(patient)}`} size="lg" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" disabled={!items.some(i => i.drug.trim())} onClick={save}><Icon name="check" />Enregistrer & générer le PDF</button></>}>
    {patient.allergies.length > 0 && <div className="med-alert mb-16"><Icon name="alert" /><div><b>Allergies déclarées : {patient.allergies.join(', ')}</b>{patient.meds && patient.meds.length ? <><br />Traitement en cours : {patient.meds.join(', ')}</> : null}</div></div>}
    <div className="xs muted mb-8">Ajout rapide (modèles du cabinet)</div>
    <div className="chips mb-16">{DRUGS.map((d, i) => <button key={i} className="chip" onClick={() => setItems(a => [...a, { drug: d[0], pos: d[1], dur: d[2] }])}><Icon name="plus" size={12} />{d[0]}</button>)}</div>
    <div className="col gap-6">{items.map((it, k) => <div key={k} className="row" style={{ gap: 6, padding: 8, border: '1px solid var(--line)', borderRadius: 10 }}><input className="input sm" style={{ flex: 1.2 }} placeholder="Médicament" value={it.drug} onChange={e => upd(k, 'drug', e.target.value)} /><input className="input sm" style={{ flex: 2 }} placeholder="Posologie" value={it.pos} onChange={e => upd(k, 'pos', e.target.value)} /><input className="input sm" style={{ width: 90 }} placeholder="Durée" value={it.dur} onChange={e => upd(k, 'dur', e.target.value)} /><button className="btn xs ghost" onClick={() => setItems(a => a.filter((_, i) => i !== k))}><Icon name="trash" /></button></div>)}{!items.length && <div className="small muted">Aucun médicament ajouté.</div>}</div>
    <button className="btn sm mt-8" onClick={() => setItems(a => [...a, { drug: '', pos: '', dur: '' }])}><Icon name="plus" />Ligne libre</button>
    {(hit || nsaid) && <div className="med-alert mt-12"><Icon name="alert" /><div><b>Attention — interaction avec une allergie déclarée</b><br />« {(hit || nsaid).drug} » : le patient a déclaré une allergie ({patient.allergies.join(', ')}). Vérifiez la prescription.</div></div>}
    <Field label="Notes" style={{ marginTop: 16 }}><input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex. : à prendre après le repas" /></Field>
    <p className="xs faint mt-12">L’alerte allergie est une aide basée sur les déclarations du patient ; la prescription reste sous la responsabilité du praticien.</p>
  </Modal>;
}

export function RxList({ patient }) {
  const { can, meta } = useAuth(); const q = useGet('/prescriptions', { patient: patient.id }); const [open, setOpen] = useState(false); const [view, setView] = useState(null);
  const list = q.data || [];
  return <>
    <div className="row between mb-16"><div className="muted small">{list.length} ordonnance(s)</div>{can('clinical.edit') && <button className="btn primary sm" onClick={() => setOpen(true)}><Icon name="plus" />Nouvelle ordonnance</button>}</div>
    <div className="grid g2">{list.map(r => <div key={r.id} className="card"><div className="card-head"><div><h3>Ordonnance du {fmt.date(r.date)}</h3><div className="sub">{r.items.length} médicament(s)</div></div><div className="row gap-6"><button className="btn sm" onClick={() => setView(r)}><Icon name="eye" />Voir</button><button className="btn sm" onClick={() => printDoc(<RxDoc rx={r} patient={patient} meta={meta} />)}><Icon name="printer" />PDF</button></div></div>
      <div className="card-body"><div className="list">{r.items.map((i, k) => <div key={k} className="li"><span className="avatar sm" style={{ background: 'var(--violet-50)', color: 'var(--violet)' }}><Icon name="pill" size={14} /></span><div className="grow"><div className="t">{i.drug}</div><div className="s">{i.pos} · {i.dur}</div></div></div>)}</div>{r.notes && <p className="xs muted mt-8">{r.notes}</p>}</div></div>)}
      {!list.length && <div className="card" style={{ gridColumn: '1/-1' }}><Empty text="Aucune ordonnance" icon="pill" /></div>}</div>
    {open && <RxModal patient={patient} onClose={() => setOpen(false)} />}
    {view && <Modal title="Ordonnance" size="lg" onClose={() => setView(null)} footer={<button className="btn primary" onClick={() => printDoc(<RxDoc rx={view} patient={patient} meta={meta} />)}><Icon name="printer" />Imprimer / PDF</button>}><RxDoc rx={view} patient={patient} meta={meta} /></Modal>}
  </>;
}
