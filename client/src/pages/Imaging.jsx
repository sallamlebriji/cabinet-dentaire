import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { PatientPicker } from '../components/Modals';
import { BACard, CAT, GroupSwitch, MediaGrid, UploadZone, Viewer } from '../components/Imaging';
import { Async, Chips, Empty, Icon, PageHead, Tabs } from '../ui';

export default function Imaging() {
  const { tab } = useParams(); const nav = useNavigate(); const { can } = useAuth(); const [sp] = useSearchParams();
  const [cat, setCat] = useState('all'); const [pid, setPid] = useState(sp.get('patient') || ''); const [group, setGroup] = useState('date'); const [view, setView] = useState(null);
  const docs = useGet(tab ? null : '/documents', { patient: pid || 'all', cat });
  const ba = useGet(tab === 'avant-apres' && can('images.private') ? '/before-after' : null);
  useEffect(() => { const d = sp.get('doc'); if (d && docs.data) { const x = docs.data.find(y => y.id === d); if (x) setView(x); } }, [docs.data]); // eslint-disable-line react-hooks/exhaustive-deps
  return <>
    <PageHead title="Radiographies & imagerie" sub="Bibliothèque documentaire patient · visualiseur intégré" />
    <div className="mb-16"><Tabs value={tab || 'lib'} onChange={k => nav(k === 'lib' ? '/app/radiographies' : '/app/radiographies/avant-apres')} tabs={[{ key: 'lib', label: 'Bibliothèque', icon: 'scan' }, { key: 'avant-apres', label: 'Avant / Après', icon: 'split', locked: !can('images.private') }]} /></div>
    {tab === 'avant-apres' ? (can('images.private') ? <Async q={ba}>{list => <div className="grid g2">{list.map(b => <BACard key={b.id} b={b} withPatient />)}{!list.length && <div className="card" style={{ gridColumn: '1/-1' }}><Empty text="Aucune comparaison" icon="split" /></div>}</div>}</Async>
      : <div className="card card-pad center muted"><Icon name="lock" size={28} style={{ margin: '0 auto 8px' }} />Photos avant/après réservées aux praticiens autorisés.</div>)
      : <>
        <div className="card mb-16"><div className="card-body row wrap between" style={{ gap: 10 }}><Chips value={cat} onChange={setCat} options={[['all', 'Tous'], ...Object.entries(CAT).map(([k, [l]]) => [k, l])]} />
          <div className="row" style={{ gap: 8 }}><div style={{ width: 280 }}><PatientPicker value={pid} onChange={setPid} /></div>{pid && <button className="btn sm ghost" onClick={() => setPid('')}>Tous les patients</button>}<GroupSwitch value={group} onChange={setGroup} /></div></div></div>
        <UploadZone patientId={pid} disabledText="Choisissez d’abord un patient dans le sélecteur ci-dessus" />
        <div className="mt-16"><Async q={docs}>{list => <MediaGrid docs={list} withPatient group={group} onOpen={setView} />}</Async></div>
        {view && <Viewer doc={view} siblings={(docs.data || []).filter(d => d.patientId === view.patientId)} onSwitch={setView} onClose={() => setView(null)} />}
      </>}
  </>;
}
