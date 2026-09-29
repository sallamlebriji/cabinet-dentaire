import { useState } from 'react';
import { post } from '../lib/api';
import { useAuth } from '../context/Auth';
import { Avatar, Card, Field, Icon, PageHead, useRun } from '../ui';
import { sname } from '../lib/format';

export default function Account() {
  const { me, meta, reload } = useAuth(); const run = useRun(); const u = me.user;
  const [setup, setSetup] = useState(null); const [code, setCode] = useState(''); const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' }); const [disablePwd, setDisablePwd] = useState('');
  return <>
    <PageHead title="Mon compte" sub="Profil, mot de passe et double authentification" />
    <div className="grid g2" style={{ alignItems: 'start' }}>
      <div className="col gap-16">
        <Card><div className="row"><Avatar p={u} size="lg" /><div><b style={{ fontSize: 17 }}>{sname(u)}</b><div className="small muted">{meta.roles[u.role]}{u.isAdmin && u.role !== 'admin' ? ' · Administrateur' : ''}</div><div className="xs muted">{u.email}</div></div></div></Card>
        <Card title="Mot de passe"><div className="col" style={{ gap: 12 }}>
          <Field label="Mot de passe actuel"><input className="input" type="password" autoComplete="current-password" value={pwd.current} onChange={e => setPwd(s => ({ ...s, current: e.target.value }))} /></Field>
          <Field label="Nouveau mot de passe" hint="10 caractères minimum"><input className="input" type="password" autoComplete="new-password" value={pwd.next} onChange={e => setPwd(s => ({ ...s, next: e.target.value }))} /></Field>
          <Field label="Confirmation"><input className="input" type="password" autoComplete="new-password" value={pwd.confirm} onChange={e => setPwd(s => ({ ...s, confirm: e.target.value }))} /></Field>
          <button className="btn primary" disabled={!pwd.next || pwd.next !== pwd.confirm} onClick={() => run(() => post('/auth/password', { current: pwd.current, next: pwd.next }), 'Mot de passe modifié', 'key').then(() => setPwd({ current: '', next: '', confirm: '' })).catch(() => { })}>Changer le mot de passe</button>
          {pwd.confirm && pwd.next !== pwd.confirm && <span className="xs" style={{ color: 'var(--danger)' }}>Les mots de passe ne correspondent pas</span>}
        </div></Card>
      </div>
      <Card title="Double authentification (2FA)" actions={u.twofaEnabled ? <span className="badge st-termine"><i className="b-dot" />Activée</span> : <span className="badge st-noshow"><i className="b-dot" />Non activée</span>}>
        {u.twofaEnabled ? <div className="col" style={{ gap: 12 }}><p className="small muted">Un code de votre application d’authentification vous est demandé à chaque connexion.</p>
          {!meta.security.twofaRequired && <><Field label="Mot de passe (pour désactiver)"><input className="input" type="password" value={disablePwd} onChange={e => setDisablePwd(e.target.value)} /></Field><button className="btn danger" onClick={() => run(() => post('/auth/2fa/disable', { password: disablePwd }), '2FA désactivée', 'shield').then(reload).catch(() => { })}>Désactiver la 2FA</button></>}</div>
          : !setup ? <div className="col" style={{ gap: 12 }}><p className="small muted">Protégez votre compte avec une application d’authentification (Google Authenticator, Microsoft Authenticator, Authy…).</p><button className="btn primary" onClick={() => run(() => post('/auth/2fa/setup')).then(setSetup).catch(() => { })}><Icon name="shield" />Configurer la 2FA</button></div>
            : <div className="col" style={{ gap: 12 }}><p className="small">1. Scannez ce QR code avec votre application :</p><img src={setup.qr} alt="QR code 2FA" style={{ width: 200, height: 200, borderRadius: 12, border: '1px solid var(--line)', margin: '0 auto' }} />
              <p className="xs muted center">Ou saisissez la clé : <span className="mono">{setup.secret}</span></p>
              <Field label="2. Saisissez le code à 6 chiffres affiché"><input className="input otp-input" inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} /></Field>
              <button className="btn primary" disabled={code.length !== 6} onClick={() => run(() => post('/auth/2fa/enable', { code }), 'Double authentification activée', 'shield').then(() => { setSetup(null); reload(); }).catch(() => { })}>Activer</button></div>}
      </Card>
    </div>
  </>;
}
