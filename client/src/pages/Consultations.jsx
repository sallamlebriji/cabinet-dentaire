import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { Async, Avatar, Icon, Kpi, Modal, PageHead } from '../ui';
import { ConsultCard, NewConsultModal } from '../components/Clinical';
import { fmt, pname, sname } from '../lib/format';

export default function Consultations() {
  const { can, types, staff } = useAuth();
  const [q, setQ] = useState(''); const [type, setType] = useState('all'); const [page, setPage] = useState(1); const [open, setOpen] = useState(false); const [view, setView] = useState(null);
  const res = useGet('/consultations', { q, type, page });
  return <>
    <PageHead title="Consultations" sub={res.data ? `${res.data.total} consultations · dossier dentaire structuré` : ''} actions={can('clinical.edit') && <button className="btn primary" onClick={() => setOpen(true)}><Icon name="plus" />Nouvelle consultation</button>} />
    <Async q={res}>{d => <>
      <div className="grid g4 mb-16"><Kpi label="Aujourd’hui" value={d.stats.today} icon="stethoscope" tone="tone-blue" /><Kpi label="7 derniers jours" value={d.stats.week} icon="calendar" tone="tone-sage" /><Kpi label="Ce mois" value={d.stats.month} icon="bars" tone="tone-violet" /><Kpi label="Patients distincts" value={d.stats.patients} icon="users" tone="tone-gold" /></div>
      <div className="card">
        <div className="card-body row wrap"><div className="search" style={{ maxWidth: 320 }}><Icon name="search" /><input defaultValue={q} onKeyDown={e => { if (e.key === 'Enter') { setQ(e.target.value); setPage(1); } }} onBlur={e => { setQ(e.target.value); setPage(1); }} placeholder="Motif, diagnostic… (Entrée)" style={{ paddingRight: 12 }} /></div>
          <select className="select sm" style={{ width: 200 }} value={type} onChange={e => { setType(e.target.value); setPage(1); }}><option value="all">Tous les types</option>{Object.entries(types).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}</select></div>
        <div className="table-wrap"><table className="table responsive"><thead><tr><th>Date</th><th>Patient</th><th>Motif</th><th>Diagnostic</th><th>Traitement réalisé</th><th>Praticien</th></tr></thead>
          <tbody>{d.rows.map(c => <tr key={c.id} className="click" onClick={() => setView(c)}><td data-l="Date" className="nowrap">{fmt.date(c.date)}</td><td data-l="Patient"><Link to={`/app/patients/${c.patientId}`} className="row" style={{ color: 'inherit' }} onClick={e => e.stopPropagation()}><Avatar p={c.patient} size="sm" /><span style={{ fontWeight: 500 }}>{pname(c.patient)}</span></Link></td><td data-l="Motif">{c.motif}</td><td data-l="Diagnostic" className="small">{c.diagnosis}</td><td data-l="Réalisé" className="small muted">{c.done}</td><td data-l="Praticien" className="nowrap small">{sname(staff(c.dentistId))}</td></tr>)}</tbody></table></div>
        {d.total > d.rows.length && <div className="card-body center"><button className="btn" onClick={() => setPage(p => p + 1)}>Afficher plus ({d.total - d.rows.length})</button></div>}
      </div></>}</Async>
    {open && <NewConsultModal onClose={() => setOpen(false)} />}
    {view && <Modal title={`Consultation du ${fmt.date(view.date)}`} size="lg" onClose={() => setView(null)} footer={<Link className="btn" to={`/app/patients/${view.patientId}/dossier`}><Icon name="user" />Dossier du patient</Link>}><ConsultCard c={view} withPatient /></Modal>}
  </>;
}
