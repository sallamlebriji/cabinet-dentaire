import { useState } from 'react';
import { del, post, put, useAction, useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { Async, Card, Field, Icon, PageHead, Switch, Tabs, useRun, cx } from '../ui';
import { fmt, downloadBlob } from '../lib/format';

export default function Settings() {
  const [tab, setTab] = useState('cabinet');
  return <>
    <PageHead title="Paramètres" sub="Cabinet, établissements, sécurité et conformité" />
    <div className="mb-16"><Tabs value={tab} onChange={setTab} tabs={[['cabinet', 'Cabinet', 'building'], ['sites', 'Établissements', 'layers'], ['securite', 'Sécurité', 'shield'], ['audit', 'Journal d’audit', 'history'], ['sauvegardes', 'Sauvegardes', 'database'], ['reservation', 'Réservation en ligne', 'globe']].map(([key, label, icon]) => ({ key, label, icon }))} /></div>
    {tab === 'cabinet' ? <Cabinet /> : tab === 'sites' ? <Sites /> : tab === 'securite' ? <Security /> : tab === 'audit' ? <Audit /> : tab === 'sauvegardes' ? <Backups /> : <Booking />}
  </>;
}

function Cabinet() {
  const { meta, reload } = useAuth(); const act = useAction(); const run = useRun(); const g = meta.general;
  const [f, setF] = useState({ group: g.group, legal: g.legal, ice: g.ice, rc: g.rc, inpe: g.inpe });
  const b = k => ({ value: f[k], onChange: e => setF(s => ({ ...s, [k]: e.target.value })) });
  return <div className="grid g2">
    <Card title="Identité du groupe"><div className="form-grid"><Field label="Nom commercial" full><input className="input" {...b('group')} /></Field><Field label="Raison sociale" full><input className="input" {...b('legal')} /></Field><Field label="ICE"><input className="input" {...b('ice')} /></Field><Field label="RC"><input className="input" {...b('rc')} /></Field><Field label="INPE"><input className="input" {...b('inpe')} /></Field><Field label="Devise"><input className="input" value="Dirham (DH)" disabled /></Field></div>
      <button className="btn primary mt-16" onClick={() => run(() => act(() => put('/settings/general', f)), 'Paramètres enregistrés').then(reload).catch(() => { })}><Icon name="check" />Enregistrer</button></Card>
    <div className="col gap-16">
      <Card title="Horaires d’ouverture"><dl className="kv"><dt>Lundi – vendredi</dt><dd>{g.hours.open} – {g.hours.close}</dd><dt>Pause déjeuner</dt><dd>{g.hours.lunch.join(' – ')}</dd><dt>Samedi</dt><dd>{g.hours.open} – {g.hours.saturday}</dd><dt>Dimanche</dt><dd>Fermé</dd></dl></Card>
      <Card title="Catalogue des actes" actions={<span className="xs muted">{meta.acts.length} actes</span>}><div style={{ maxHeight: 300, overflow: 'auto' }}><div className="list">{meta.acts.map(a => <div key={a.code} className="li"><span className="tag mono">{a.code}</span><div className="grow small">{a.label}</div><b className="mono small">{fmt.money(a.price)}</b></div>)}</div></div></Card>
    </div>
  </div>;
}

function Sites() {
  const { meta, setClinic, me } = useAuth();
  return <>
    <div className="grid g3 mb-16">{meta.clinics.filter(c => me.allowedClinics.includes(c.id)).map(c => <Card key={c.id}><div className="row"><span className="clinic-dot" style={{ width: 40, height: 40 }}><Icon name="building" /></span><div><b style={{ fontSize: 15 }}>{c.name}</b><div className="xs muted">{c.address}</div></div></div>
      <div className="grid g2 mt-16" style={{ gap: 8 }}>{[['Praticiens', meta.staff.filter(s => s.clinicId === c.id && s.role === 'dentiste').length], ['Fauteuils', c.chairs.length], ['Téléphone', c.phone], ['Ville', c.city]].map(([l, v]) => <div key={l} style={{ padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 10 }}><div className="xs muted">{l}</div><b className="small">{v}</b></div>)}</div>
      <button className="btn sm mt-12" style={{ width: '100%' }} onClick={() => setClinic(c.id)}><Icon name="arrowRight" />Basculer sur ce cabinet</button></Card>)}</div>
    <Card title="Architecture multi-tenant"><div className="grid g3" style={{ gap: 12 }}>{[['Isolation des données', 'Chaque requête est filtrée côté serveur par établissement : un utilisateur rattaché à un cabinet ne peut accéder qu’aux patients, rendez-vous, stock et finances de ce cabinet.', 'lock'], ['Vue direction', 'Les administrateurs et le rôle « tous les sites » disposent d’une vue consolidée (en-tête X-Clinic = all) sans duplication de données.', 'layers'], ['Traçabilité', 'Toute consultation de dossier, modification clinique ou export est inscrite dans le journal d’audit (append-only).', 'history']].map(([t, d, ic]) => <div key={t} style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 12 }}><span className="avatar sm" style={{ background: 'var(--primary-50)', color: 'var(--primary)' }}><Icon name={ic} size={14} /></span><b className="mt-8" style={{ display: 'block' }}>{t}</b><p className="small muted mt-4">{d}</p></div>)}</div></Card>
  </>;
}

function Security() {
  const { meta, reload } = useAuth(); const act = useAction(); const run = useRun(); const sessions = useGet('/sessions'); const sec = meta.security;
  const set = (k, v, msg) => run(() => act(() => put('/settings/security', { [k]: v })), msg, 'shield').then(reload).catch(() => { });
  return <div className="grid g2">
    <Card title="Authentification & sessions"><div className="col" style={{ gap: 14 }}>
      <div className="row between"><div><b style={{ fontWeight: 500 }}>Double authentification (2FA) obligatoire</b><div className="xs muted">Application TOTP (Google Authenticator, Authy…) pour tous les membres</div></div><Switch checked={sec.twofaRequired} onChange={v => set('twofaRequired', v, v ? '2FA obligatoire activée' : '2FA facultative')} /></div>
      <div className="row between"><div><b style={{ fontWeight: 500 }}>Restreindre l’accès aux IP du cabinet</b><div className="xs muted">Accès hors cabinet uniquement via l’application mobile</div></div><Switch checked={sec.ipAllow} onChange={v => set('ipAllow', v, 'Paramètre de sécurité mis à jour')} /></div>
      <div className="row between"><div><b style={{ fontWeight: 500 }}>Expiration de session</b><div className="xs muted">Déconnexion automatique après inactivité</div></div><select className="select sm" style={{ width: 120 }} value={sec.sessionTimeout} onChange={e => set('sessionTimeout', +e.target.value, `Expiration de session : ${e.target.value} min`)}>{[15, 30, 60, 120].map(v => <option key={v} value={v}>{v} min</option>)}</select></div>
      <div className="row between"><div><b style={{ fontWeight: 500 }}>Mots de passe</b><div className="xs muted">Hachage bcrypt · 10 caractères minimum · limitation des tentatives</div></div><span className="badge st-termine"><i className="b-dot" />Actif</span></div>
      <div className="divider" style={{ margin: 0 }} /><div className="xs muted">Sessions actives</div>
      <Async q={sessions}>{list => list.map(s => <div key={s.id} className="row"><span className="avatar xs" style={{ background: 'var(--navy)' }}>{(s.user || '?').split(' ').slice(-1)[0][0]}</span><div className="grow small"><b style={{ fontWeight: 500 }}>{s.user}</b> · <span className="muted">{(s.userAgent || '').slice(0, 60)}</span><div className="xs muted">{s.ip} · actif {fmt.ago(s.lastSeenAt)}</div></div>{s.current ? <span className="badge tone-blue">Vous</span> : <button className="btn xs danger" onClick={() => run(() => act(() => del(`/sessions/${s.id}`)), 'Session révoquée', 'lock').catch(() => { })}>Révoquer</button>}</div>)}</Async>
    </div></Card>
    <div className="col gap-16">
      <Card title="Protection des données"><div className="col" style={{ gap: 10 }}>{[['Chiffrement', sec.encryption, 'lock'], ['Contrôle d’accès', 'RBAC appliqué côté serveur + cloisonnement par cabinet', 'key'], ['Historique', 'Journal d’audit de chaque accès et modification (qui, quoi, quand, IP)', 'history'], ['Sauvegardes', sec.backups, 'database'], ['Portail patient', 'Connexion par code SMS à usage unique, haché et limité en tentatives', 'smartphone']].map(([t, d, ic]) => <div key={t} className="row top"><span className="avatar sm" style={{ background: 'var(--success-50)', color: 'var(--success)' }}><Icon name={ic} size={14} /></span><div><b style={{ fontWeight: 500 }}>{t}</b><div className="small muted">{d}</div></div></div>)}</div></Card>
      <div className="card premium"><div className="card-body small"><b className="row gap-6"><Icon name="shield" size={16} style={{ color: 'var(--gold)' }} />Conformité</b><p className="muted mt-8">La plateforme est conçue pour permettre la conformité aux exigences applicables dans le pays de déploiement (par ex. loi 09-08 et CNDP au Maroc, RGPD en Europe) : consentements tracés, droits d’accès et de rectification, export du dossier, journalisation, durée de conservation paramétrable.</p></div></div>
    </div>
  </div>;
}

function Audit() {
  const [q, setQ] = useState(''); const res = useGet('/audit', { q });
  return <div className="card"><div className="card-body row between wrap"><div className="search" style={{ maxWidth: 320 }}><Icon name="search" /><input defaultValue={q} onKeyDown={e => e.key === 'Enter' && setQ(e.target.value)} onBlur={e => setQ(e.target.value)} placeholder="Utilisateur, action, patient… (Entrée)" style={{ paddingRight: 12 }} /></div><span className="small muted">{res.data ? res.data.total : '…'} événements · journal append-only</span></div>
    <Async q={res}>{d => <div className="table-wrap"><table className="table responsive"><thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Cible</th><th>IP</th></tr></thead><tbody>{d.rows.map(a => <tr key={a.id}><td data-l="Date" className="nowrap small">{fmt.date(a.at)} {fmt.time(a.at)}</td><td data-l="Utilisateur"><b style={{ fontWeight: 500 }}>{a.user}</b></td><td data-l="Action">{a.action}</td><td data-l="Cible" className="small muted">{a.target}</td><td data-l="IP" className="xs mono muted">{a.ip}</td></tr>)}</tbody></table></div>}</Async></div>;
}

function Backups() {
  const { meta } = useAuth(); const run = useRun(); const [busy, setBusy] = useState(false);
  const exportAll = () => run(async () => { const r = await fetch('/api/export', { credentials: 'include', headers: { 'X-Clinic': 'all' } }); if (!r.ok) throw new Error('Export refusé'); downloadBlob(await r.text(), `nacre-export-${new Date().toISOString().slice(0, 10)}.json`, 'application/json'); }, 'Export téléchargé', 'download').catch(() => { });
  return <div className="grid g2">
    <Card title="Sauvegardes" actions={<span className="badge st-termine"><i className="b-dot" />Actives</span>}><p className="small muted">{meta.security.backups}.</p><div className="med-alert mt-12" style={{ background: 'var(--primary-50)', color: 'var(--navy)', borderColor: 'var(--primary-100)' }}><Icon name="info" /><div className="small">En production, planifiez un <span className="mono">mysqldump --single-transaction</span> chiffré vers un stockage hors site (voir README). Le bouton ci-dessous journalise un déclenchement manuel.</div></div>
      <button className="btn primary mt-12" disabled={busy} onClick={() => { setBusy(true); run(() => post('/backups'), 'Sauvegarde déclenchée · consignée dans le journal d’audit', 'database').finally(() => setBusy(false)).catch(() => { }); }}><Icon name="refresh" />{busy ? 'Sauvegarde en cours…' : 'Lancer une sauvegarde maintenant'}</button></Card>
    <Card title="Export & portabilité"><p className="small muted">Exportez l’intégralité des données du groupe au format ouvert (JSON) — portabilité, archivage ou migration. Les secrets (mots de passe, clés 2FA) sont exclus.</p><button className="btn mt-12" onClick={exportAll}><Icon name="download" />Exporter toutes les données (JSON)</button></Card>
  </div>;
}

function Booking() {
  const { meta, reload, types } = useAuth(); const act = useAction(); const run = useRun(); const bk = meta.booking;
  const set = (patchObj, msg) => run(() => act(() => put('/settings/booking', patchObj)), msg, 'globe').then(reload).catch(() => { });
  return <div className="grid g2">
    <Card title="Page publique « Prendre rendez-vous »" actions={<Switch checked={bk.enabled} onChange={v => set({ enabled: v }, `Réservation en ligne ${v ? 'activée' : 'désactivée'}`)} />}><div className="col" style={{ gap: 14 }}>
      <Field label="Lien public"><div className="row"><input className="input" value={window.location.origin + '/rdv'} readOnly /><a className="btn" href="/rdv" target="_blank" rel="noreferrer"><Icon name="eye" />Ouvrir</a></div></Field>
      <Field label="Types réservables en ligne"><div className="chips">{Object.entries(types).map(([k, t]) => <button key={k} className={cx('chip', bk.types.includes(k) && 'on')} onClick={() => set({ types: bk.types.includes(k) ? bk.types.filter(x => x !== k) : [...bk.types, k] }, 'Types réservables mis à jour')}>{t.label}</button>)}</div></Field>
      <div className="row"><Field label="Délai minimum (heures)" style={{ flex: 1 }}><input className="input" type="number" defaultValue={bk.minNotice} onBlur={e => set({ minNotice: +e.target.value }, 'Délai minimum enregistré')} /></Field><Field label="Réservation jusqu’à (jours)" style={{ flex: 1 }}><input className="input" type="number" defaultValue={bk.maxDays} onBlur={e => set({ maxDays: +e.target.value }, 'Horizon de réservation enregistré')} /></Field></div>
      <p className="xs muted">Seuls les créneaux réellement disponibles dans l’agenda sont proposés. Confirmation automatique par SMS.</p></div></Card>
    <Card title="Widget pour votre site web"><pre style={{ background: 'var(--navy)', color: '#DCE6F5', padding: 14, borderRadius: 10, fontSize: 12, overflow: 'auto', margin: 0 }}>{`<a href="${window.location.origin}/rdv"\n   style="background:#2C6BCB;color:#fff;padding:12px 20px;border-radius:10px">\n  Prendre rendez-vous\n</a>`}</pre><p className="small muted mt-12">Ajoutez un bouton « Prendre rendez-vous » sur votre site, Google Business Profile ou Instagram.</p></Card>
  </div>;
}
