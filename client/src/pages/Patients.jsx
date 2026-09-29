import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { useActions } from '../components/Modals';
import { Avatar, Chips, Empty, Icon, Loading, PageHead } from '../ui';
import { age, fmt, sname } from '../lib/format';

const TAGS = [['all', 'Tous'], ['nouveaux', 'Nouveaux (30 j)'], ['Orthodontie', 'Orthodontie'], ['Implantologie', 'Implantologie'], ['Risque no-show', 'Risque no-show'], ['allergies', 'Allergies déclarées'], ['solde', 'Solde dû']];

export default function Patients() {
  const { can, dentists, staff } = useAuth(); const actions = useActions(); const nav = useNavigate();
  const [q, setQ] = useState(''); const [dq, setDq] = useState(''); const [dentist, setDentist] = useState('all'); const [sort, setSort] = useState('last'); const [tag, setTag] = useState('all');
  useEffect(() => { const t = setTimeout(() => setDq(q), 250); return () => clearTimeout(t); }, [q]);
  const list = useGet('/patients', { q: dq, dentist, sort, tag });
  const rows = list.data || [];
  return <>
    <PageHead title="Patients" sub={`${rows.length} patient${rows.length > 1 ? 's' : ''} · dossiers médicaux centralisés`} actions={can('patients.edit') && <button className="btn primary" onClick={() => actions.newPatient()}><Icon name="plus" />Nouveau patient</button>} />
    <div className="card">
      <div className="card-body row wrap" style={{ gap: 10 }}>
        <div className="search" style={{ maxWidth: 320 }}><Icon name="search" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Nom, téléphone, n° de dossier…" style={{ paddingRight: 12 }} /></div>
        <select className="select sm" style={{ width: 210 }} value={dentist} onChange={e => setDentist(e.target.value)}><option value="all">Tous les praticiens</option>{dentists.map(d => <option key={d.id} value={d.id}>{sname(d)}</option>)}</select>
        <select className="select sm" style={{ width: 190 }} value={sort} onChange={e => setSort(e.target.value)}><option value="last">Trier : nom</option><option value="visit">Trier : dernière visite</option><option value="due">Trier : solde dû</option></select>
      </div>
      <div style={{ padding: '0 20px 14px' }}><Chips value={tag} onChange={setTag} options={TAGS} /></div>
      {list.isLoading ? <Loading /> : <div className="table-wrap"><table className="table responsive"><thead><tr><th>Patient</th><th>Âge</th><th>Téléphone</th><th>Praticien</th><th>Dernière visite</th><th>Prochain RDV</th><th className="num">Solde</th><th>Tags</th></tr></thead>
        <tbody>{rows.map(p => <tr key={p.id} className="click" onClick={() => nav(`/app/patients/${p.id}`)}>
          <td data-l="Patient"><div className="row"><Avatar p={p} size="sm" /><div><div style={{ fontWeight: 500 }}>{p.last} {p.first}</div><div className="xs muted">{p.fileNo}</div></div></div></td>
          <td data-l="Âge">{age(p.dob)} ans</td><td data-l="Téléphone" className="nowrap">{p.phone}</td><td data-l="Praticien" className="nowrap">{sname(staff(p.dentistId))}</td>
          <td data-l="Dernière visite">{p.lastVisit ? fmt.date(p.lastVisit) : <span className="faint">—</span>}</td>
          <td data-l="Prochain RDV">{p.nextAppt ? <span className="nowrap">{fmt.rel(p.nextAppt.date)} · {p.nextAppt.start}</span> : <span className="faint">—</span>}</td>
          <td data-l="Solde" className="num">{p.due > 0 ? <b style={{ color: 'var(--danger)' }}>{fmt.money(p.due)}</b> : <span className="faint">0 DH</span>}</td>
          <td data-l="Tags"><div className="row gap-4 wrap">{p.allergies.length > 0 && <span className="tag allergy">Allergie</span>}{p.tags.map(t => <span key={t} className={'tag ' + (t === 'VIP' ? 'gold' : '')}>{t}</span>)}</div></td>
        </tr>)}{!rows.length && <tr><td colSpan={8}><Empty text="Aucun patient ne correspond à ces critères" icon="users" /></td></tr>}</tbody></table></div>}
    </div>
  </>;
}
