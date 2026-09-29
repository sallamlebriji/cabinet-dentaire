import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { get, post } from '../lib/api';
import { Avatar, Field, Icon, Loading, useUI, cx } from '../ui';
import { D, fmt, downloadBlob } from '../lib/format';

const STEPS = ['Soin', 'Praticien', 'Date', 'Heure', 'Coordonnées'];
const DESC = { consultation: 'Premier rendez-vous, bilan ou nouvelle douleur', controle: 'Visite de suivi ou contrôle annuel', detartrage: 'Nettoyage professionnel et polissage', urgence: 'Douleur, gonflement, dent cassée', orthodontie: 'Consultation ou suivi orthodontique', carie: 'Soin d’une carie identifiée', extraction: 'Sur indication de votre dentiste', implantologie: 'Consultation implantaire', prothese: 'Couronne, bridge, prothèse', chirurgie: 'Sur indication de votre dentiste' };
const dname = d => `${d.title ? d.title + ' ' : ''}${d.first} ${d.last}`;

export default function Booking() {
  const { toast } = useUI(); const [sp] = useSearchParams();
  const info = useQuery({ queryKey: ['public-info'], queryFn: () => get('/public/info') });
  const [st, setSt] = useState({ step: 1, clinic: sp.get('cabinet') || 'fes', type: '', dentist: '', date: '', time: '', slotDentist: '' });
  const [f, setF] = useState({ first: '', last: '', phone: '', email: '', dob: '', note: '', remind: true, consent: false, website: '' });
  const [done, setDone] = useState(null); const [busy, setBusy] = useState(false);
  const set = o => setSt(s => ({ ...s, ...o }));
  const dentists = useQuery({ queryKey: ['pub-dn', st.clinic, st.type], queryFn: () => get('/public/dentists', { clinic: st.clinic, type: st.type }), enabled: !!st.type });
  const days = useQuery({ queryKey: ['pub-days', st.clinic, st.type, st.dentist], queryFn: () => get('/public/days', { clinic: st.clinic, type: st.type, dentist: st.dentist }), enabled: st.step >= 3 && !!st.dentist });
  const slots = useQuery({ queryKey: ['pub-slots', st.clinic, st.type, st.dentist, st.date], queryFn: () => get('/public/slots', { clinic: st.clinic, type: st.type, dentist: st.dentist, date: st.date }), enabled: st.step >= 4 && !!st.date });
  useEffect(() => { document.title = 'Prendre rendez-vous — ' + ((info.data && info.data.group) || 'Nacre'); document.body.classList.add('site'); return () => document.body.classList.remove('site'); }, [info.data]);
  if (info.isLoading) return <Loading />;
  if (info.isError) return <div className="empty">Service momentanément indisponible.</div>;
  const I = info.data; const clinic = I.clinics.find(c => c.id === st.clinic) || I.clinics[0]; const type = I.types.find(t => t.key === st.type);
  const dn = I.dentists.find(d => d.id === (st.slotDentist || st.dentist));
  const can = (st.step === 1 && st.type) || (st.step === 2 && st.dentist) || (st.step === 3 && st.date) || (st.step === 4 && st.time) || st.step === 5;
  const confirm = async () => {
    if (!f.consent) return toast('Merci d’accepter le traitement de vos données pour réserver', 'alert');
    setBusy(true);
    try { const r = await post('/public/book', { ...st, dentist: st.dentist, ...f }); setDone(r); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    catch (e) { toast(e.message, 'alert'); if (e.status === 409) set({ step: 4, time: '' }); } finally { setBusy(false); }
  };
  const ics = a => { const dt = (y, t) => y.replace(/-/g, '') + 'T' + t.replace(':', '') + '00'; downloadBlob(`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Nacre//RDV//FR\r\nBEGIN:VEVENT\r\nUID:${a.id}@nacre\r\nDTSTART:${dt(a.date, a.start)}\r\nDTEND:${dt(a.date, D.hm(D.min(a.start) + a.dur))}\r\nSUMMARY:${a.typeLabel} — ${a.dentist.name}\r\nLOCATION:${a.clinic.address}\r\nEND:VEVENT\r\nEND:VCALENDAR`, 'rendez-vous-dentiste.ics', 'text/calendar'); };

  return <div className="book-shell">
    <div className="book-top"><div className="wrap"><span className="brand-mark"><Icon name="tooth" /></span><div><b style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--navy)', fontWeight: 500 }}>{I.group}</b><div className="xs muted">Prise de rendez-vous en ligne · propulsé par Nacre</div></div><Link className="btn sm" to="/portail" style={{ marginLeft: 'auto' }}>Mon espace patient</Link></div></div>
    <div className="book-hero"><div className="wrap"><span className="eyebrow gold">Disponible 24h/24</span><h1 className="mt-12">Prendre rendez-vous</h1><p style={{ color: '#C7D4E8', marginTop: 6 }}>Choisissez votre soin, votre praticien et le créneau qui vous convient. Seuls les créneaux réellement disponibles sont affichés.</p></div></div>
    <div className="wrap book-body"><div className="book-grid">
      <div className="card" style={{ overflow: 'hidden' }}>
        {!I.enabled ? <div className="card-body center" style={{ padding: 40 }}><Icon name="calendar" size={36} style={{ margin: '0 auto 10px', color: 'var(--faint)' }} /><b>La prise de rendez-vous en ligne est momentanément indisponible.</b><p className="muted mt-8">Merci de contacter le cabinet par téléphone.</p></div>
          : done ? <div className="card-body center" style={{ padding: '44px 24px' }}><div className="success-mark"><Icon name="check" /></div><h2 className="serif" style={{ fontSize: 28, color: 'var(--navy)', fontWeight: 500 }}>Rendez-vous confirmé</h2><p className="muted mt-8">Une confirmation vient d’être envoyée par SMS.</p>
            <div className="card mt-24" style={{ maxWidth: 420, margin: '24px auto 0', textAlign: 'left' }}><div className="card-body"><div className="row"><Avatar p={{ ...done.dentist, color: done.dentist.color }} size="lg" /><div><b style={{ fontSize: 16 }}>{fmt.dateLongCap(done.date)}</b><div style={{ fontSize: 22, fontWeight: 600, color: 'var(--primary)' }}>{fmt.hShort(done.start)}</div></div></div><div className="divider" /><dl className="kv" style={{ gridTemplateColumns: '90px 1fr' }}><dt>Soin</dt><dd>{done.typeLabel}</dd><dt>Praticien</dt><dd>{done.dentist.name}</dd><dt>Adresse</dt><dd>{done.clinic.address}</dd></dl></div></div>
            <div className="row wrap mt-24" style={{ justifyContent: 'center' }}><button className="btn" onClick={() => ics(done)}><Icon name="calendar" />Ajouter à mon agenda</button><Link className="btn primary" to="/portail"><Icon name="user" />Accéder à mon espace patient</Link></div></div>
            : <>
              <div className="stepper">{STEPS.map((l, i) => <div key={l} className={cx('step', i + 1 === st.step && 'on', i + 1 < st.step && 'done')}><span className="n">{i + 1 < st.step ? '✓' : i + 1}</span>{l}</div>)}</div>
              <div className="card-body" style={{ padding: 22 }}>
                {st.step === 1 && <><h3 style={{ fontSize: 17 }}>Dans quel cabinet ?</h3><div className="chips mt-12 mb-16">{I.clinics.map(c => <button key={c.id} className={cx('chip', st.clinic === c.id && 'on')} onClick={() => set({ clinic: c.id, dentist: '' })}><Icon name="building" size={13} />{c.name}</button>)}</div>
                  <h3 style={{ fontSize: 17 }}>Quel est le motif de votre rendez-vous ?</h3><div className="opt-grid mt-12">{I.types.map(t => <button key={t.key} className={cx('opt', st.type === t.key && 'on')} onClick={() => set({ type: t.key, dentist: '' })}><div className="row between"><b>{t.label}</b><i style={{ width: 10, height: 10, borderRadius: '50%', background: t.color }} /></div><span>{DESC[t.key]}</span><div className="xs muted mt-8"><Icon name="clock" size={12} style={{ display: 'inline', verticalAlign: -2 }} /> {t.dur} min{t.key === 'consultation' ? ' · ' + fmt.money(t.price) : ''}</div></button>)}</div></>}
                {st.step === 2 && <><h3 style={{ fontSize: 17 }}>Avec quel praticien ?</h3><div className="opt-grid mt-12">{(dentists.data || []).length > 1 && <button className={cx('opt', st.dentist === 'any' && 'on')} onClick={() => set({ dentist: 'any' })}><div className="row"><span className="avatar" style={{ background: 'var(--sage-50)', color: 'var(--sage)' }}><Icon name="zap" size={16} /></span><div><b>Premier disponible</b><span>Le créneau le plus proche</span></div></div></button>}{(dentists.data || []).map(d => <button key={d.id} className={cx('opt', st.dentist === d.id && 'on')} onClick={() => set({ dentist: d.id })}><div className="row"><Avatar p={d} /><div><b>{dname(d)}</b><span>{d.spec}</span></div></div></button>)}</div></>}
                {st.step === 3 && <><h3 style={{ fontSize: 17 }}>Choisissez une date</h3>{days.isLoading ? <Loading /> : <div className="days mt-12">{(days.data || []).map(x => <div key={x.date} className={cx('day', st.date === x.date && 'on', !x.count && 'off')} onClick={() => set({ date: x.date, time: '' })}><div className="dw">{fmt.dow(x.date)}</div><div className="dd">{D.parse(x.date).getDate()}</div><div className="dc">{x.count ? `${x.count} créneaux` : 'Complet'}</div></div>)}</div>}<p className="xs muted mt-12">Faites défiler pour voir les dates suivantes.</p></>}
                {st.step === 4 && <><h3 style={{ fontSize: 17 }}>{fmt.dateLongCap(st.date)}</h3>{slots.isLoading ? <Loading /> : [['Matin', s => s.time < '12:30'], ['Après-midi', s => s.time >= '12:30']].map(([l, fn]) => { const arr = (slots.data || []).filter(fn); return arr.length ? <div key={l}><div className="xs muted mt-16 mb-8" style={{ textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 600 }}>{l}</div><div className="slots">{arr.map(s => <button key={s.time} className={cx('slot', st.time === s.time && 'on')} onClick={() => set({ time: s.time, slotDentist: s.dentistId })}>{s.time}</button>)}</div></div> : null; })}{slots.data && !slots.data.length && <p className="muted mt-12">Plus de créneau disponible ce jour.</p>}</>}
                {st.step === 5 && <><h3 style={{ fontSize: 17 }}>Vos coordonnées</h3><div className="form-grid mt-12">
                  {[['first', 'Prénom *'], ['last', 'Nom *'], ['phone', 'Téléphone mobile *'], ['email', 'Email']].map(([k, l]) => <Field key={k} label={l}><input className="input" type={k === 'email' ? 'email' : 'text'} value={f[k]} onChange={e => setF(s => ({ ...s, [k]: e.target.value }))} placeholder={k === 'phone' ? '06 00 00 00 00' : ''} /></Field>)}
                  <Field label="Date de naissance"><input className="input" type="date" value={f.dob} onChange={e => setF(s => ({ ...s, dob: e.target.value }))} /></Field>
                  <Field label="Précisions (facultatif)" full><textarea className="textarea" style={{ minHeight: 70 }} value={f.note} onChange={e => setF(s => ({ ...s, note: e.target.value }))} placeholder="Ex. : douleur en bas à gauche depuis 2 jours" /></Field>
                  <input type="text" tabIndex={-1} autoComplete="off" style={{ display: 'none' }} value={f.website} onChange={e => setF(s => ({ ...s, website: e.target.value }))} />
                  <div className="full col gap-6"><label className="check small"><input type="checkbox" checked={f.remind} onChange={e => setF(s => ({ ...s, remind: e.target.checked }))} /> Je souhaite recevoir la confirmation et les rappels par SMS / WhatsApp</label><label className="check small"><input type="checkbox" checked={f.consent} onChange={e => setF(s => ({ ...s, consent: e.target.checked }))} /> J’accepte que mes données soient traitées par le cabinet pour la gestion de mon rendez-vous *</label></div>
                </div></>}
              </div>
              <div className="row between" style={{ padding: '14px 22px', borderTop: '1px solid var(--line)', background: 'var(--surface-2)' }}>
                <button className="btn" style={st.step === 1 ? { visibility: 'hidden' } : undefined} onClick={() => set({ step: st.step - 1 })}><Icon name="chevronLeft" />Retour</button>
                <button className="btn primary" disabled={!can || busy} onClick={() => (st.step < 5 ? (set({ step: st.step + 1 }), window.scrollTo({ top: 0, behavior: 'smooth' })) : confirm())}>{st.step === 5 ? <><Icon name="check" />Confirmer le rendez-vous</> : <>Continuer<Icon name="chevronRight" /></>}</button>
              </div></>}
      </div>
      {!done && <div className="col gap-16">
        <div className="card"><div className="card-head"><h3>Récapitulatif</h3></div><div className="card-body"><dl className="kv" style={{ gridTemplateColumns: '90px 1fr' }}><dt>Cabinet</dt><dd>{clinic.name}<div className="xs muted">{clinic.address}</div></dd><dt>Soin</dt><dd>{type ? <>{type.label} <span className="muted small">({type.dur} min)</span></> : '—'}</dd><dt>Praticien</dt><dd>{dn ? dname(dn) : st.dentist === 'any' ? 'Premier disponible' : '—'}</dd><dt>Date</dt><dd>{st.date ? fmt.dateLong(st.date) : '—'}</dd><dt>Heure</dt><dd>{st.time || '—'}</dd></dl></div></div>
        <div className="card"><div className="card-body small col" style={{ gap: 10 }}><div className="row top"><Icon name="check" size={16} style={{ color: 'var(--sage)' }} /><span>Confirmation immédiate par SMS</span></div><div className="row top"><Icon name="check" size={16} style={{ color: 'var(--sage)' }} /><span>Annulation ou modification gratuite jusqu’à 24h avant, depuis votre espace patient</span></div><div className="row top"><Icon name="phone" size={16} style={{ color: 'var(--primary)' }} /><span>Une urgence ? Appelez le {clinic.phone}</span></div></div></div>
      </div>}
    </div></div>
  </div>;
}
