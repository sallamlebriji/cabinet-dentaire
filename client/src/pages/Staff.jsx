import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { patch, post, put, useAction, useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { Async, Avatar, Badge, Card, Field, Icon, Kpi, Modal, PageHead, Tabs, useRun, cx } from '../ui';
import { fmt, sname } from '../lib/format';

export default function Staff() {
  const { reload } = useAuth(); const [tab, setTab] = useState('equipe'); const [add, setAdd] = useState(false);
  const q = useGet('/staff');
  return <>
    <PageHead title="Personnel" sub="Équipe, rôles et permissions granulaires" actions={<button className="btn primary" onClick={() => setAdd(true)}><Icon name="plus" />Ajouter un membre</button>} />
    <div className="mb-16"><Tabs value={tab} onChange={setTab} tabs={[{ key: 'equipe', label: 'Équipe' }, { key: 'roles', label: 'Rôles & permissions' }, { key: 'praticiens', label: 'Praticiens' }]} /></div>
    <Async q={q}>{d => tab === 'roles' ? <Roles onChanged={reload} /> : tab === 'praticiens' ? <Dentists d={d} /> : <Team d={d} />}</Async>
    {add && <AddMember onClose={() => setAdd(false)} />}
  </>;
}

function Team({ d }) {
  const { meta, clinicById, me } = useAuth(); const act = useAction(); const run = useRun();
  const n = r => d.users.filter(u => u.role === r || (r === 'admin' && u.isAdmin)).length;
  return <>
    <div className="grid g4 mb-16"><Kpi label="Administrateurs" value={n('admin')} icon="shield" tone="tone-gold" /><Kpi label="Dentistes" value={n('dentiste')} icon="tooth" tone="tone-blue" /><Kpi label="Assistant(e)s" value={n('assistant')} icon="user" tone="tone-teal" /><Kpi label="Secrétariat & gestion" value={n('secretaire') + n('comptable') + n('gestionnaire')} icon="phone" tone="tone-sage" /></div>
    <div className="card"><div className="table-wrap"><table className="table responsive"><thead><tr><th>Membre</th><th>Rôle</th><th>Établissement</th><th>Contact</th><th>2FA</th><th>Dernière connexion</th><th>Actif</th></tr></thead>
      <tbody>{d.users.map(u => <tr key={u.id}><td data-l="Membre"><div className="row"><Avatar p={u} size="sm" /><div><b style={{ fontWeight: 500 }}>{sname(u)}</b>{u.spec && <div className="xs muted">{u.spec}</div>}</div></div></td>
        <td data-l="Rôle"><Badge label={meta.roles[u.role]} cls={u.role === 'admin' ? 'tone-gold' : u.role === 'dentiste' ? 'st-confirme' : 'tone-gray'} dot={false} />{u.isAdmin && u.role !== 'admin' && <> <Badge label="Admin" cls="tone-gold" dot={false} /></>}</td>
        <td data-l="Site">{u.clinicId === 'all' ? 'Tous les sites' : (clinicById(u.clinicId) || {}).city}</td><td data-l="Contact" className="small">{u.email}<div className="xs muted">{u.phone}</div></td>
        <td data-l="2FA">{u.twofaEnabled ? <Badge label="Activée" cls="st-termine" /> : <Badge label="Non activée" cls="st-noshow" />}</td><td data-l="Connexion" className="small muted">{u.lastLoginAt ? fmt.ago(u.lastLoginAt) : 'jamais'}</td>
        <td data-l="Actif"><label className="switch"><input type="checkbox" checked={u.active} disabled={u.id === me.user.id} onChange={e => run(() => act(() => patch(`/staff/${u.id}`, { active: e.target.checked })), e.target.checked ? 'Compte réactivé' : 'Compte désactivé · sessions révoquées', 'shield').catch(() => { })} /><span /></label></td></tr>)}</tbody></table></div></div>
  </>;
}

function Roles({ onChanged }) {
  const { meta } = useAuth(); const act = useAction(); const run = useRun(); const [rp, setRp] = useState(meta.rolePerms);
  const toggle = (role, k) => { if (role === 'admin') return; const has = rp[role].includes(k); const next = has ? rp[role].filter(x => x !== k) : [...rp[role], k]; setRp(s => ({ ...s, [role]: next })); run(() => act(() => put(`/roles/${role}`, { perms: next })), `${meta.roles[role]} : ${has ? 'retrait' : 'ajout'} de « ${meta.permsCatalog.find(p => p[0] === k)[1]} »`, 'shield').then(onChanged).catch(() => setRp(meta.rolePerms)); };
  return <>
    <div className="card mb-16" style={{ background: 'var(--primary-50)', borderColor: 'var(--primary-100)' }}><div className="card-body row small"><Icon name="info" size={18} style={{ color: 'var(--primary)' }} /><span>Permissions granulaires par rôle, appliquées côté serveur. Exemple : la <b>secrétaire</b> gère les rendez-vous et les paiements mais ne peut pas consulter ni modifier les informations cliniques sensibles. Connectez-vous avec un compte de démonstration d’un autre rôle pour le vérifier.</span></div></div>
    <div className="card"><div className="table-wrap"><table className="table perm-table"><thead><tr><th>Permission</th>{Object.values(meta.roles).map(r => <th key={r}>{r}</th>)}</tr></thead>
      <tbody>{meta.permsCatalog.map(([k, l]) => <tr key={k}><td>{l}<div className="xs faint mono">{k}</div></td>{Object.keys(meta.roles).map(r => { const on = rp[r].includes(k); return <td key={r}><span className={cx('perm-cell', on && 'on')} onClick={() => toggle(r, k)} style={r === 'admin' ? { opacity: 0.6, cursor: 'not-allowed' } : undefined} title={r === 'admin' ? 'L’administrateur dispose de toutes les permissions' : undefined}>{on && <Icon name="check" />}</span></td>; })}</tr>)}</tbody></table></div></div>
  </>;
}

function Dentists({ d }) {
  const { clinicById } = useAuth(); const nav = useNavigate();
  return <div className="grid g3">{d.users.filter(u => u.role === 'dentiste').map(u => { const s = d.stats[u.id] || {}; return <Card key={u.id}><div className="row"><Avatar p={u} size="lg" /><div><b style={{ fontSize: 15 }}>{sname(u)}</b><div className="small muted">{u.spec}</div><div className="xs muted">{(clinicById(u.clinicId) || {}).name} · {u.chair}</div></div></div>
    <div className="grid g2 mt-16" style={{ gap: 8 }}>{[['RDV ce mois', s.month], ['Aujourd’hui', s.today], ['Patients suivis', s.patients], ['Satisfaction', '★ ' + fmt.dec(s.rating)]].map(([l, v]) => <div key={l} style={{ padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 10 }}><div className="xs muted">{l}</div><b>{v}</b></div>)}</div>
    <button className="btn sm mt-12" style={{ width: '100%' }} onClick={() => nav('/app/agenda')}><Icon name="calendar" />Agenda</button></Card>; })}</div>;
}

function AddMember({ onClose }) {
  const { meta, me } = useAuth(); const act = useAction(); const run = useRun(); const [done, setDone] = useState(null);
  const [f, setF] = useState({ first: '', last: '', role: 'assistant', clinicId: me.allowedClinics[0], email: '' });
  const b = k => ({ value: f[k], onChange: e => setF(s => ({ ...s, [k]: e.target.value })) });
  if (done) return <Modal title="Membre ajouté" onClose={onClose} footer={<button className="btn primary" onClick={onClose}>Terminé</button>}><p>Le compte de <b>{sname(done.user)}</b> est créé. Transmettez ce mot de passe temporaire par un canal sûr ; il devra être changé à la première connexion :</p><div className="card mt-12" style={{ background: 'var(--surface-2)' }}><div className="card-body center mono" style={{ fontSize: 20, letterSpacing: '.05em' }}>{done.temporaryPassword}</div></div><p className="xs muted mt-12">En production, une invitation avec lien d’activation à usage unique est envoyée par email à la place.</p></Modal>;
  return <Modal title="Ajouter un membre" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" onClick={() => run(() => act(() => post('/staff', f)), 'Membre ajouté', 'user').then(setDone).catch(() => { })}>Créer le compte</button></>}>
    <div className="form-grid"><Field label="Prénom"><input className="input" autoFocus {...b('first')} /></Field><Field label="Nom"><input className="input" {...b('last')} /></Field>
      <Field label="Rôle"><select className="select" {...b('role')}>{Object.entries(meta.roles).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <Field label="Établissement"><select className="select" {...b('clinicId')}>{meta.clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}<option value="all">Tous les sites</option></select></Field>
      <Field label="Email professionnel" full><input className="input" type="email" {...b('email')} /></Field></div>
  </Modal>;
}
