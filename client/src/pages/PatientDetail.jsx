import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { patch, post, useAction, useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { useActions } from '../components/Modals';
import { Async, Avatar, Badge, Card, Empty, Field, Icon, Kpi, MapBadge, Modal, Progress, StatusBadge, Tabs, useRun } from '../ui';
import Odontogram from '../components/Odontogram';
import PlanEditor, { PlanSummary } from '../components/PlanEditor';
import { BACard, GroupSwitch, MediaGrid, UploadZone, Viewer } from '../components/Imaging';
import { ConsultCard, NewConsultModal, RxList } from '../components/Clinical';
import { Bubble } from './Communication';
import { age, fmt, pname, sname, METHOD, INV_ST, PLAN_ST } from '../lib/format';

const TABS = [['apercu', 'Aperçu', 'user'], ['dossier', 'Dossier dentaire', 'stethoscope', 'clinical.view'], ['odontogramme', 'Odontogramme', 'tooth', 'clinical.view'], ['plan', 'Plan de traitement', 'clipboard'], ['imagerie', 'Radios & documents', 'scan', 'clinical.view'], ['avantapres', 'Avant / Après', 'split', 'images.private'], ['ordonnances', 'Ordonnances', 'pill', 'clinical.view'], ['finances', 'Factures & paiements', 'wallet', 'finance.view'], ['rdv', 'Rendez-vous', 'calendar'], ['communication', 'Communication', 'message', 'comm.send']];

export default function PatientDetail() {
  const { id, tab = 'apercu' } = useParams();
  const q = useGet(`/patients/${id}`, { tab });
  return <Async q={q}>{d => <Detail d={d} tab={tab} />}</Async>;
}

function Detail({ d, tab }) {
  const { can, staff, clinicById } = useAuth(); const actions = useActions(); const nav = useNavigate();
  const p = d.patient; const s = d.stats; const [edit, setEdit] = useState(false);
  const def = TABS.find(t => t[0] === tab) || TABS[0]; const locked = def[3] && !can(def[3]);
  return <>
    <div className="crumbs"><Link to="/app/patients">Patients</Link><Icon name="chevronRight" size={12} /><span>{pname(p)}</span></div>
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="p-hero">
        <Avatar p={p} size="xl" />
        <div className="grow" style={{ minWidth: 240 }}>
          <div className="row wrap" style={{ gap: 10 }}><h2>{p.first} {p.last}</h2>{p.tags.map(t => <span key={t} className={'tag ' + (t === 'VIP' ? 'gold' : '')}>{t}</span>)}</div>
          <div className="p-meta"><span><Icon name="user" />{p.sex === 'F' ? 'Femme' : 'Homme'} · {age(p.dob)} ans · né{p.sex === 'F' ? 'e' : ''} le {fmt.date(p.dob)}</span><span><Icon name="phone" />{p.phone}</span><span><Icon name="mail" />{p.email}</span><span><Icon name="tooth" />{sname(staff(p.dentistId))}</span><span><Icon name="building" />{(clinicById(p.clinicId) || {}).name} · {p.fileNo}</span></div>
        </div>
        <div className="row wrap">
          {can('agenda.manage') && <button className="btn primary" onClick={() => actions.newAppt({ patientId: p.id, dentistId: p.dentistId })}><Icon name="calendar" />Rendez-vous</button>}
          {can('finance.edit') && <button className="btn" onClick={() => actions.pay({ patientId: p.id })}><Icon name="card" />Encaisser</button>}
          {can('comm.send') && <Link className="btn" to={`/app/communication/${p.id}`}><Icon name="message" />Message</Link>}
          <button className="btn icon" title="Résumer avec l’assistant IA" onClick={() => window.dispatchEvent(new CustomEvent('nacre:assistant', { detail: { task: 'summary', patientId: p.id } }))}><Icon name="sparkles" /></button>
          {can('patients.edit') && <button className="btn icon" title="Modifier" onClick={() => setEdit(true)}><Icon name="edit" /></button>}
        </div>
      </div>
      {p.allergies.length > 0 && <div style={{ padding: '0 24px 16px' }}><div className="med-alert"><Icon name="alert" /><div><b>Allergies déclarées : {p.allergies.join(', ')}</b>{p.history && p.history.length ? ` · Antécédents : ${p.history.join(', ')}` : ''}{p.meds && p.meds.length ? ` · Traitement en cours : ${p.meds.join(', ')}` : ''}</div></div></div>}
      <div className="p-stats">
        <div><b>{s.visits}</b><span>Consultations réalisées</span></div><div><b>{s.last ? fmt.date(s.last) : '—'}</b><span>Dernière visite</span></div>
        <div><b>{s.next ? `${fmt.dayMonth(s.next.date)} · ${s.next.start}` : '—'}</b><span>Prochain rendez-vous</span></div>
        <div><b style={{ color: s.balance && s.balance.due > 0 ? 'var(--danger)' : 'var(--success)' }}>{s.balance ? fmt.money(s.balance.due) : '•••'}</b><span>Reste à payer</span></div>
      </div>
    </div>
    <div className="mt-16"><Tabs value={def[0]} onChange={k => nav(`/app/patients/${p.id}/${k}`)} tabs={TABS.map(([k, l, ic, perm]) => ({ key: k, label: l, count: d.counts[k], locked: perm && !can(perm) }))} /></div>
    <div className="mt-16">{locked ? <LockedTab /> : <TabBody tab={def[0]} d={d} />}</div>
    {edit && <EditPatient p={p} onClose={() => setEdit(false)} />}
  </>;
}
const LockedTab = () => <div className="card card-pad center"><div className="locked-view" style={{ margin: '20px auto' }}><div className="ico"><Icon name="lock" /></div><b>Données protégées</b><p className="muted small mt-8">Votre rôle ne permet pas de consulter cette section du dossier. Chaque tentative d’accès est tracée dans le journal d’audit.</p></div></div>;

function TabBody({ tab, d }) {
  const p = d.patient;
  switch (tab) {
    case 'dossier': return <Dossier p={p} />;
    case 'odontogramme': return <Odontogram pid={p.id} />;
    case 'plan': return <PlanTab p={p} />;
    case 'imagerie': return <ImagingTab p={p} />;
    case 'avantapres': return <BATab p={p} />;
    case 'ordonnances': return <RxList patient={p} />;
    case 'finances': return <Finances p={p} />;
    case 'rdv': return <RdvTab p={p} />;
    case 'communication': return <CommTab p={p} />;
    default: return <Apercu d={d} />;
  }
}

function Apercu({ d }) {
  const { can, types, clinicById } = useAuth(); const actions = useActions(); const act = useAction(); const run = useRun();
  const p = d.patient; const [notes, setNotes] = useState(p.notes || ''); const [med, setMed] = useState(false);
  const appts = useGet(`/patients/${p.id}/appointments`); const next = (appts.data || []).filter(a => a.date >= new Date().toISOString().slice(0, 10) && ['confirme', 'attente'].includes(a.status)).reverse().slice(0, 4);
  return <div className="grid g-3-2">
    <div className="col gap-16">
      <Card title="Identité & coordonnées"><dl className="kv"><dt>Nom complet</dt><dd>{p.first} {p.last}</dd><dt>Date de naissance</dt><dd>{fmt.date(p.dob)} ({age(p.dob)} ans)</dd><dt>Téléphone</dt><dd>{p.phone}</dd><dt>Email</dt><dd>{p.email || '—'}</dd><dt>Adresse</dt><dd>{p.address || '—'}</dd><dt>Profession</dt><dd>{p.profession || '—'}</dd></dl></Card>
      <div className="grid g2">
        <Card title="Informations administratives"><dl className="kv" style={{ gridTemplateColumns: '110px 1fr' }}><dt>N° dossier</dt><dd>{p.fileNo}</dd><dt>Couverture</dt><dd>{p.cover}</dd><dt>N° affiliation</dt><dd>{p.coverNo || '—'}</dd><dt>Créé le</dt><dd>{fmt.date(p.createdOn)}</dd><dt>Cabinet</dt><dd>{(clinicById(p.clinicId) || {}).name}</dd></dl></Card>
        <Card title="Contact d’urgence"><dl className="kv" style={{ gridTemplateColumns: '90px 1fr' }}><dt>Nom</dt><dd>{p.emergency.name || '—'}</dd><dt>Lien</dt><dd>{p.emergency.relation || '—'}</dd><dt>Téléphone</dt><dd>{p.emergency.phone || '—'}</dd></dl>
          <div className="divider" /><div className="xs muted mb-8">Consentements</div><div className="row wrap gap-6">{[['rgpd', 'Données de santé'], ['sms', 'SMS'], ['email', 'Email'], ['whatsapp', 'WhatsApp'], ['photos', 'Photos']].map(([k, l]) => <span key={k} className={'badge ' + (p.consent[k] ? 'st-termine' : 'st-annule')}>{p.consent[k] ? '✓' : '✕'} {l}</span>)}</div></Card>
      </div>
      <Card title="Notes du cabinet" actions={<span className="xs muted">Visibles par l’équipe</span>}><textarea className="textarea" readOnly={!can('patients.edit')} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Préférences, informations pratiques…" />
        {can('patients.edit') && <div className="row mt-8" style={{ justifyContent: 'flex-end' }}><button className="btn sm" onClick={() => run(() => act(() => patch(`/patients/${p.id}`, { notes })), 'Notes enregistrées').catch(() => { })}><Icon name="check" />Enregistrer</button></div>}</Card>
    </div>
    <div className="col gap-16">
      <Card title="Informations médicales" actions={can('clinical.edit') && <button className="btn sm" onClick={() => setMed(true)}><Icon name="edit" />Modifier</button>}>
        {!p.clinicalHidden ? <><div className="clin-sec" style={{ marginTop: 0 }}><h5>Antécédents renseignés</h5><p>{p.history.join(', ') || 'Aucun antécédent déclaré'}</p></div>
          <div className="clin-sec"><h5>Allergies déclarées</h5><div className="row wrap gap-6">{p.allergies.map(a => <span key={a} className="tag allergy">{a}</span>)}{!p.allergies.length && <p>Aucune allergie déclarée</p>}</div></div>
          <div className="clin-sec"><h5>Médicaments déclarés</h5><p>{p.meds.join(', ') || 'Aucun'}</p></div><div className="clin-sec"><h5>Tabac</h5><p>{p.smoker ? 'Fumeur déclaré' : 'Non-fumeur'}</p></div>
          <p className="xs faint mt-12">Informations déclarées par le patient — à vérifier à chaque consultation.</p></>
          : <div className="small muted"><Icon name="lock" size={14} style={{ display: 'inline' }} /> Réservé aux praticiens et assistant(e)s. Allergies : {p.allergies.join(', ') || 'aucune'}.</div>}
      </Card>
      <Card title="Prochains rendez-vous" actions={can('agenda.manage') && <button className="btn sm" onClick={() => actions.newAppt({ patientId: p.id, dentistId: p.dentistId })}><Icon name="plus" />Ajouter</button>}>
        <div className="list">{next.map(a => <div key={a.id} className="li click" onClick={() => actions.appt(a.id)}><div className="avatar sm" style={{ background: types[a.type].color }}>{fmt.dayMonth(a.date).split(' ')[0]}</div><div className="grow"><div className="t">{types[a.type].label}</div><div className="s">{fmt.dateLong(a.date)} · {a.start}</div></div><StatusBadge status={a.status} /></div>)}{!next.length && <div className="small muted">Aucun rendez-vous planifié</div>}</div></Card>
      {d.plan && <Link className="card hover" to={`/app/patients/${p.id}/plan`} style={{ color: 'inherit', display: 'block' }}><div className="card-head"><h3>Plan de traitement</h3><MapBadge map={PLAN_ST} value={d.plan.status} /></div><div className="card-body"><PlanSummary plan={d.plan} /></div></Link>}
      <Card title="Historique des accès" actions={<span className="xs muted">Journal d’audit</span>}><div className="list">{d.access.map(a => <div key={a.id} className="li"><div className="grow"><div className="small"><b>{a.user}</b> — {a.action}</div><div className="xs muted">{fmt.ago(a.at)}</div></div></div>)}</div></Card>
    </div>
    {med && <EditMedical p={p} onClose={() => setMed(false)} />}
  </div>;
}

function EditPatient({ p, onClose }) {
  const { allDentists } = useAuth(); const act = useAction(); const run = useRun();
  const [f, setF] = useState({ first: p.first, last: p.last, phone: p.phone, email: p.email || '', profession: p.profession || '', cover: p.cover || '', coverNo: p.coverNo || '', dob: p.dob, address: p.address || '', dentistId: p.dentistId, tags: p.tags.join(', '), emName: p.emergency.name || '', emPhone: p.emergency.phone || '', consent: { ...p.consent } });
  const b = k => ({ value: f[k], onChange: e => setF(s => ({ ...s, [k]: e.target.value })) });
  const save = () => run(() => act(() => patch(`/patients/${p.id}`, { ...f, emergency: { ...p.emergency, name: f.emName, phone: f.emPhone } })), 'Fiche mise à jour').then(onClose).catch(() => { });
  return <Modal title="Modifier la fiche" size="lg" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" onClick={save}><Icon name="check" />Enregistrer</button></>}>
    <div className="form-grid">{[['first', 'Prénom'], ['last', 'Nom'], ['phone', 'Téléphone'], ['email', 'Email'], ['profession', 'Profession'], ['cover', 'Couverture'], ['coverNo', 'N° d’affiliation']].map(([k, l]) => <Field key={k} label={l}><input className="input" {...b(k)} /></Field>)}
      <Field label="Date de naissance"><input className="input" type="date" {...b('dob')} /></Field><Field label="Adresse" full><input className="input" {...b('address')} /></Field>
      <Field label="Contact d’urgence"><input className="input" {...b('emName')} /></Field><Field label="Téléphone d’urgence"><input className="input" {...b('emPhone')} /></Field>
      <Field label="Praticien référent"><select className="select" {...b('dentistId')}>{allDentists.map(d => <option key={d.id} value={d.id}>{sname(d)}</option>)}</select></Field><Field label="Tags"><input className="input" {...b('tags')} /></Field>
      <div className="full row wrap" style={{ gap: 16 }}>{[['sms', 'SMS'], ['email', 'Email'], ['whatsapp', 'WhatsApp'], ['photos', 'Photos (usage interne)']].map(([k, l]) => <label key={k} className="check"><input type="checkbox" checked={!!f.consent[k]} onChange={e => setF(s => ({ ...s, consent: { ...s.consent, [k]: e.target.checked } }))} /> {l}</label>)}</div>
    </div>
  </Modal>;
}
function EditMedical({ p, onClose }) {
  const act = useAction(); const run = useRun();
  const [f, setF] = useState({ history: p.history.join(', '), allergies: p.allergies.join(', '), meds: p.meds.join(', '), smoker: p.smoker });
  const save = () => run(() => act(() => patch(`/patients/${p.id}/medical`, f)), 'Informations médicales mises à jour').then(onClose).catch(() => { });
  return <Modal title="Informations médicales déclarées" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" onClick={save}>Enregistrer</button></>}>
    <div className="col" style={{ gap: 14 }}>{[['history', 'Antécédents renseignés'], ['allergies', 'Allergies déclarées'], ['meds', 'Médicaments déclarés']].map(([k, l]) => <Field key={k} label={l}><input className="input" value={f[k]} onChange={e => setF(s => ({ ...s, [k]: e.target.value }))} /></Field>)}
      <label className="check"><input type="checkbox" checked={f.smoker} onChange={e => setF(s => ({ ...s, smoker: e.target.checked }))} /> Fumeur</label><p className="xs muted">Chaque modification est horodatée et tracée dans le journal d’audit.</p></div>
  </Modal>;
}

function Dossier({ p }) {
  const { can } = useAuth(); const [open, setOpen] = useState(false);
  const cs = useGet('/consultations', { patient: p.id }); const docs = useGet('/documents', { patient: p.id }); const rx = useGet('/prescriptions', { patient: p.id });
  return <div className="grid g-3-2" style={{ alignItems: 'start' }}>
    <Card title="Historique chronologique" sub={cs.data ? `${cs.data.total} consultation(s)` : ''} actions={can('clinical.edit') && <button className="btn primary sm" onClick={() => setOpen(true)}><Icon name="plus" />Nouvelle consultation</button>}>
      <Async q={cs}>{d => <div className="timeline">{d.rows.map(c => <div key={c.id} className="tl-item"><span className="tl-dot"><i /></span><div className="tl-date">{fmt.dateLong(c.date)}</div><ConsultCard c={c} docs={docs.data || []} rx={rx.data || []} /></div>)}{!d.rows.length && <Empty text="Aucune consultation enregistrée" icon="stethoscope" />}</div>}</Async>
    </Card>
    <div className="col gap-16">
      <div className="card premium"><div className="card-head"><h3 className="row gap-6"><Icon name="sparkles" size={16} style={{ color: 'var(--gold)' }} />Synthèse assistée</h3></div><div className="card-body"><p className="small muted">L’assistant peut résumer l’historique à partir des notes saisies par le praticien. Il ne pose aucun diagnostic.</p><button className="btn gold sm mt-12" onClick={() => window.dispatchEvent(new CustomEvent('nacre:assistant', { detail: { task: 'summary', patientId: p.id } }))}><Icon name="sparkles" />Résumer l’historique</button></div></div>
      <Card title="Dernières informations déclarées"><div className="clin-sec" style={{ marginTop: 0 }}><h5>Antécédents</h5><p>{(p.history || []).join(', ') || '—'}</p></div><div className="clin-sec"><h5>Allergies</h5><p>{p.allergies.join(', ') || '—'}</p></div><div className="clin-sec"><h5>Médicaments</h5><p>{(p.meds || []).join(', ') || '—'}</p></div></Card>
      <Card title="Raccourcis"><div className="col gap-6"><Link className="btn" to={`/app/patients/${p.id}/odontogramme`}><Icon name="tooth" />Odontogramme</Link><Link className="btn" to={`/app/patients/${p.id}/imagerie`}><Icon name="scan" />Radiographies & photos</Link><Link className="btn" to={`/app/patients/${p.id}/ordonnances`}><Icon name="pill" />Ordonnances</Link><Link className="btn" to={`/app/documents?type=compte_rendu&patient=${p.id}`}><Icon name="file" />Compte rendu</Link></div></Card>
    </div>
    {open && <NewConsultModal patientId={p.id} onClose={() => setOpen(false)} />}
  </div>;
}

function PlanTab({ p }) {
  const { can } = useAuth(); const act = useAction(); const run = useRun(); const q = useGet('/plans', { patient: p.id });
  return <Async q={q}>{plans => <>
    {plans.map(pl => <PlanEditor key={pl.id} plan={pl} />)}
    {!plans.length && <div className="card"><Empty text="Aucun plan de traitement pour ce patient" icon="clipboard" /></div>}
    {can('clinical.edit') && <button className="btn mt-12" onClick={() => run(() => act(() => post('/plans', { patientId: p.id, title: 'Plan de traitement' })), 'Plan créé', 'clipboard').catch(() => { })}><Icon name="plus" />Nouveau plan de traitement</button>}
  </>}</Async>;
}

function ImagingTab({ p }) {
  const q = useGet('/documents', { patient: p.id }); const [group, setGroup] = useState('date'); const [view, setView] = useState(null);
  return <><div className="row between wrap mb-16" style={{ gap: 10 }}><GroupSwitch value={group} onChange={setGroup} /></div>
    <UploadZone patientId={p.id} />
    <div className="mt-16"><Async q={q}>{docs => <MediaGrid docs={docs} group={group} onOpen={setView} />}</Async></div>
    {view && <Viewer doc={{ ...view, patient: p }} siblings={q.data || []} onSwitch={setView} onClose={() => setView(null)} />}</>;
}
function BATab({ p }) {
  const q = useGet('/before-after', { patient: p.id });
  return <><div className="card mb-16" style={{ background: 'var(--gold-50)', borderColor: '#EADFC8' }}><div className="card-body row small"><Icon name="shield" size={18} style={{ color: 'var(--gold)' }} /><span>Les photos avant/après sont <b>privées par défaut</b>, accessibles uniquement selon les permissions définies, et ne peuvent être partagées au patient qu’avec son consentement.</span></div></div>
    <Async q={q}>{list => <div className="grid g2">{list.map(b => <BACard key={b.id} b={b} />)}{!list.length && <div className="card" style={{ gridColumn: '1/-1' }}><Empty text="Aucune comparaison avant / après" icon="split" /></div>}</div>}</Async></>;
}

function Finances({ p }) {
  const { can } = useAuth(); const actions = useActions(); const q = useGet(`/patients/${p.id}/finances`); const nav = useNavigate();
  return <Async q={q}>{({ invoices, payments, balance: b }) => <>
    <div className="grid g3">
      <Kpi label="Total traitement" value={fmt.money(b.total)} icon="receipt" tone="tone-navy" />
      <Kpi label="Payé" value={fmt.money(b.paid)} icon="check" tone="tone-green" foot={<div className="grow"><Progress value={b.total ? (b.paid / b.total) * 100 : 0} tone="sage" /></div>} />
      <Kpi label="Reste à payer" value={fmt.money(b.due)} icon="wallet" tone={b.due > 0 ? 'tone-red' : 'tone-gray'} foot={can('finance.edit') && b.due > 0 && <button className="btn xs primary" onClick={() => actions.pay({ patientId: p.id })}>Encaisser</button>} />
    </div>
    <div className="grid g2 mt-16">
      <Card title="Factures" actions={<Link className="small" to="/app/facturation">Module facturation</Link>} bodyClass="table-wrap"><table className="table"><thead><tr><th>N°</th><th>Date</th><th className="num">Montant</th><th>Statut</th></tr></thead><tbody>{invoices.map(i => <tr key={i.id} className="click" onClick={() => nav(`/app/facturation/${i.id}`)}><td>{i.number}</td><td>{fmt.date(i.date)}</td><td className="num">{fmt.money(i.total)}</td><td><MapBadge map={INV_ST} value={i.status} /></td></tr>)}{!invoices.length && <tr><td colSpan={4} className="muted">Aucune facture</td></tr>}</tbody></table></Card>
      <Card title="Paiements" bodyClass="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Type</th><th>Mode</th><th className="num">Montant</th></tr></thead><tbody>{payments.map(x => <tr key={x.id}><td>{fmt.date(x.date)}</td><td>{x.kind === 'acompte' ? <Badge label="Acompte" cls="tone-violet" dot={false} /> : x.kind === 'remboursement' ? <Badge label="Remboursement" cls="st-noshow" dot={false} /> : <Badge label="Paiement" cls="st-termine" dot={false} />}</td><td>{METHOD[x.method]}</td><td className="num" style={x.amount < 0 ? { color: 'var(--danger)' } : undefined}>{fmt.money(x.amount)}</td></tr>)}{!payments.length && <tr><td colSpan={4} className="muted">Aucun paiement</td></tr>}</tbody></table></Card>
    </div>
  </>}</Async>;
}

function RdvTab({ p }) {
  const { types, staff } = useAuth(); const actions = useActions(); const q = useGet(`/patients/${p.id}/appointments`);
  return <Async q={q}>{ap => { const c = k => ap.filter(a => a.status === k).length; return <>
    <div className="grid g4"><Kpi label="Rendez-vous" value={ap.length} icon="calendar" tone="tone-blue" /><Kpi label="Honorés" value={c('termine')} icon="check" tone="tone-green" /><Kpi label="Annulés" value={c('annule')} icon="x" tone="tone-gray" /><Kpi label="No-show" value={c('noshow')} icon="alert" tone="tone-red" foot={p.noShows >= 2 && <span>Rappel renforcé recommandé</span>} /></div>
    <div className="card mt-16"><div className="table-wrap"><table className="table responsive"><thead><tr><th>Date</th><th>Heure</th><th>Type</th><th>Praticien</th><th>Statut</th><th>Note</th></tr></thead>
      <tbody>{ap.map(a => <tr key={a.id} className="click" onClick={() => actions.appt(a.id)}><td data-l="Date">{fmt.date(a.date)}</td><td data-l="Heure">{a.start}</td><td data-l="Type"><span className="row gap-6 nowrap"><i style={{ width: 8, height: 8, borderRadius: '50%', background: types[a.type].color, display: 'inline-block' }} />{types[a.type].label}</span></td><td data-l="Praticien">{sname(staff(a.dentistId))}</td><td data-l="Statut"><StatusBadge status={a.status} />{a.late > 0 && <span className="xs muted"> +{a.late} min</span>}</td><td data-l="Note" className="small muted">{a.note}</td></tr>)}</tbody></table></div></div>
  </>; }}</Async>;
}

function CommTab({ p }) {
  const q = useGet(`/threads/${p.id}`);
  return <Card title="Échanges avec le patient" actions={<Link className="btn sm" to={`/app/communication/${p.id}`}><Icon name="message" />Ouvrir la messagerie</Link>}>
    <Async q={q}>{d => <div className="chat-body" style={{ maxHeight: 420, borderRadius: 12 }}>{d.messages.map(m => <Bubble key={m.id} m={m} />)}{!d.messages.length && <div className="muted small">Aucun échange</div>}</div>}</Async>
  </Card>;
}
