import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { post, useAction, useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { PatientPicker } from '../components/Modals';
import { RxModal } from '../components/Clinical';
import { Card, Field, Icon, PageHead, useRun, cx } from '../ui';
import { GenericDoc, PlanDoc, printDoc } from '../lib/paper';
import { D, fmt, pname, sname } from '../lib/format';

const TYPES = { certificat: ['Certificat', 'badge'], compte_rendu: ['Compte rendu', 'file'], ordonnance: ['Ordonnance', 'pill'], devis: ['Devis', 'file'], facture: ['Facture', 'receipt'], plan: ['Plan de traitement', 'clipboard'] };
const TPL = {
  certificat: (p, dn) => `Je soussigné(e), ${sname(dn)}, chirurgien-dentiste, certifie avoir examiné ce jour ${p.sex === 'F' ? 'Mme' : 'M.'} ${p.first} ${p.last}, né${p.sex === 'F' ? 'e' : ''} le ${fmt.date(p.dob)}.\n\nSon état de santé bucco-dentaire nécessite un arrêt de ses activités professionnelles / scolaires pendant 2 jours, à compter du ${fmt.date(D.today())}.\n\nCertificat établi à la demande de l’intéressé(e) et remis en main propre pour servir et valoir ce que de droit.`,
  compte_rendu: (p, dn, c) => `Compte rendu de consultation — ${fmt.dateLong(c ? c.date : D.today())}\n\nMotif : ${c ? c.motif : '…'}\n\nObservations : ${c ? c.observations || '—' : '…'}\n\nDiagnostic (établi par le praticien) : ${c ? c.diagnosis || '—' : '…'}\n\nTraitement réalisé : ${c ? c.done || '—' : '…'}\n\nSuite proposée : ${c ? c.proposed || '—' : '…'}\n\nConfraternellement.`
};

export default function Documents() {
  const { meta, staff, can } = useAuth(); const [sp] = useSearchParams(); const act = useAction(); const run = useRun();
  const [type, setType] = useState(sp.get('type') || 'certificat'); const [pid, setPid] = useState(sp.get('patient') || 'p1');
  const pat = useGet(`/patients/${pid}`, { log: '0' }); const p = pat.data && pat.data.patient;
  const cons = useGet(type === 'compte_rendu' && can('clinical.view') ? '/consultations' : null, { patient: pid });
  const quotes = useGet(type === 'devis' ? '/quotes' : null, { patient: pid }); const fin = useGet(type === 'facture' ? `/patients/${pid}/finances` : null); const plans = useGet(type === 'plan' ? '/plans' : null, { patient: pid });
  const recent = useGet('/generated-docs');
  const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [rx, setRx] = useState(false);
  const generic = ['certificat', 'compte_rendu'].includes(type);
  useEffect(() => { if (!p || !generic) return; const dn = staff(p.dentistId); const c = cons.data && cons.data.rows[0]; setTitle(type === 'certificat' ? 'Certificat médical' : 'Compte rendu de consultation'); setBody(TPL[type](p, dn, c)); }, [p, type, cons.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const doc = p && generic ? <GenericDoc title={title} body={body} patient={p} meta={meta} /> : null;
  const save = share => run(() => act(() => post('/generated-docs', { patientId: pid, type, title, body, share })), share ? 'Document partagé sur le portail patient · patient notifié' : 'Document enregistré', share ? 'globe' : 'file').then(() => { if (!share) printDoc(doc); }).catch(() => { });
  return <>
    <PageHead title="Documents" sub="Génération automatique en PDF avec l’en-tête du cabinet" />
    <div className="grid dgrid" style={{ gridTemplateColumns: 'minmax(0,400px) minmax(0,1fr)', alignItems: 'start' }}>
      <div className="col gap-16">
        <Card title="Générer un document"><div className="col" style={{ gap: 14 }}>
          <div className="cond-grid">{Object.entries(TYPES).map(([k, [l, ic]]) => <button key={k} className={cx('cond-btn', type === k && 'on')} onClick={() => setType(k)}><Icon name={ic} size={15} />{l}</button>)}</div>
          <Field label="Patient"><PatientPicker value={pid} onChange={setPid} /></Field>
          {generic && <><Field label="Titre"><input className="input" value={title} onChange={e => setTitle(e.target.value)} /></Field><Field label="Contenu"><textarea className="textarea" style={{ minHeight: 260 }} value={body} onChange={e => setBody(e.target.value)} /></Field>
            {can('clinical.edit') && <button className="btn gold sm" onClick={() => window.dispatchEvent(new CustomEvent('nacre:assistant', { detail: { task: 'report', patientId: pid } }))}><Icon name="sparkles" />Rédiger avec l’assistant</button>}
            {can('clinical.edit') && <div className="row"><button className="btn primary grow" onClick={() => save(false)}><Icon name="download" />Générer le PDF</button><button className="btn" title="Partager sur le portail patient" onClick={() => save(true)}><Icon name="globe" />Portail</button></div>}</>}
          {type === 'ordonnance' && <><p className="small muted">Les ordonnances sont générées depuis le dossier patient avec contrôle des allergies déclarées.</p>{can('clinical.edit') && <button className="btn primary" disabled={!p} onClick={() => setRx(true)}><Icon name="plus" />Rédiger une ordonnance</button>}</>}
          {type === 'devis' && <><div className="list">{(quotes.data || []).map(q => <Link key={q.id} className="li click" to={`/app/devis/${q.id}`} style={{ color: 'inherit' }}><div className="grow"><div className="t">{q.number}</div><div className="s">{fmt.date(q.date)} · {fmt.money(q.total)}</div></div><Icon name="chevronRight" size={16} className="faint" /></Link>)}{quotes.data && !quotes.data.length && <div className="small muted">Aucun devis pour ce patient.</div>}</div><Link className="btn" to="/app/devis"><Icon name="plus" />Créer un devis</Link></>}
          {type === 'facture' && <div className="list">{((fin.data && fin.data.invoices) || []).slice(0, 8).map(i => <Link key={i.id} className="li click" to={`/app/facturation/${i.id}`} style={{ color: 'inherit' }}><div className="grow"><div className="t">{i.number}</div><div className="s">{fmt.date(i.date)} · {fmt.money(i.total)}</div></div><Icon name="chevronRight" size={16} className="faint" /></Link>)}</div>}
          {type === 'plan' && <div className="list">{(plans.data || []).map(pl => <div key={pl.id} className="li"><div className="grow"><div className="t">{pl.title}</div><div className="s">{fmt.money(pl.items.reduce((s, i) => s + i.price, 0))}</div></div><button className="btn sm" onClick={() => printDoc(<PlanDoc plan={pl} patient={p} meta={meta} />)}><Icon name="printer" />PDF</button></div>)}{plans.data && !plans.data.length && <div className="small muted">Aucun plan.</div>}</div>}
        </div></Card>
        <Card title="Documents générés récemment"><div className="list">{(recent.data || []).map(d => <div key={d.id} className="li"><span className="avatar sm" style={{ background: 'var(--bg-2)', color: 'var(--muted)' }}><Icon name={TYPES[d.type] ? TYPES[d.type][1] : 'file'} size={14} /></span><div className="grow" style={{ minWidth: 0 }}><div className="t truncate">{d.title}</div><div className="s">{pname(d.patient)} · {fmt.date(d.date)}</div></div>{d.body && d.patient && <button className="btn xs" onClick={() => printDoc(<GenericDoc title={d.title} body={d.body} date={d.date} dentistId={d.dentistId} patient={{ ...d.patient, address: '' }} meta={meta} />)}><Icon name="printer" /></button>}</div>)}</div></Card>
      </div>
      <div style={{ minWidth: 0 }}>{doc || <div className="card"><div className="empty"><Icon name="file" /><div>{generic ? 'Chargement…' : 'Sélectionnez un certificat ou un compte rendu pour l’aperçu'}</div></div></div>}</div>
    </div>
    {rx && p && <RxModal patient={p} onClose={() => setRx(false)} />}
    <style>{'@media (max-width:1100px){.dgrid{grid-template-columns:1fr!important}}'}</style>
  </>;
}
