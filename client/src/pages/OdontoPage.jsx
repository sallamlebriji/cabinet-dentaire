import { Link, useNavigate, useParams } from 'react-router-dom';
import { useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { Avatar, Icon, PageHead } from '../ui';
import { PatientPicker } from '../components/Modals';
import Odontogram from '../components/Odontogram';
import { age, pname, sname } from '../lib/format';

export default function OdontoPage() {
  const { pid = 'p1' } = useParams(); const nav = useNavigate(); const { staff } = useAuth();
  const q = useGet(`/patients/${pid}`, { tab: 'odontogramme' }); const p = q.data && q.data.patient;
  return <>
    <PageHead title="Odontogramme" sub="Schéma dentaire interactif · numérotation FDI" actions={<><div style={{ width: 320 }}><PatientPicker value={pid} onChange={id => nav(`/app/odontogramme/${id}`)} /></div><Link className="btn" to={`/app/patients/${pid}`}><Icon name="user" />Fiche patient</Link></>} />
    {p && <div className="card mb-16"><div className="card-body row wrap" style={{ gap: 14 }}><Avatar p={p} /><div className="grow"><b>{pname(p)}</b><div className="xs muted">{age(p.dob)} ans · {p.fileNo} · {sname(staff(p.dentistId))}</div></div>{p.allergies.length > 0 && <span className="tag allergy">Allergies : {p.allergies.join(', ')}</span>}</div></div>}
    <Odontogram key={pid} pid={pid} />
  </>;
}
