import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { post } from '../lib/api';
import { useAuth } from '../context/Auth';
import { Icon, Field } from '../ui';

const DEMO = [
  ['s.bennani@atlas-dentaire.ma', 'Dr. Salma Bennani', 'Dentiste · Administratrice'],
  ['direction@atlas-dentaire.ma', 'Rachid El Ouali', 'Administrateur · 3 cabinets'],
  ['y.alaoui@atlas-dentaire.ma', 'Dr. Youssef Alaoui', 'Dentiste'],
  ['accueil.fes@atlas-dentaire.ma', 'Mounia Rahmani', 'Secrétaire'],
  ['h.ziani@atlas-dentaire.ma', 'Hajar Ziani', 'Assistante'],
  ['compta@atlas-dentaire.ma', 'Adil Benomar', 'Comptable'],
  ['s.kabbaj@atlas-dentaire.ma', 'Samira Kabbaj', 'Gestionnaire'],
  ['accueil.meknes@atlas-dentaire.ma', 'Ghita Amrani', 'Secrétaire · Meknès']
];

export default function Login() {
  const { status, reload, notice } = useAuth(); const nav = useNavigate(); const loc = useLocation();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [mfa, setMfa] = useState(null); const [code, setCode] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  if (status === 'in') return <Navigate to={(loc.state && loc.state.from) || '/app'} replace />;

  const submit = async e => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      if (mfa) { await post('/auth/2fa/verify', { mfaToken: mfa, code }); }
      else { const r = await post('/auth/login', { email, password }); if (r.mfaRequired) { setMfa(r.mfaToken); setBusy(false); return; } }
      await reload(); nav((loc.state && loc.state.from) || '/app', { replace: true });
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  return <div className="login-wrap">
    <aside className="login-side">
      <Link to="/" className="row" style={{ gap: 10, color: '#fff', position: 'relative', zIndex: 1 }}><span className="brand-mark"><Icon name="tooth" /></span><span><span className="brand-name" style={{ color: '#fff' }}>Nacre</span><span className="brand-sub" style={{ display: 'block' }}>Dental OS</span></span></Link>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h1 className="h-display" style={{ color: '#fff', fontSize: 44 }}>Votre cabinet dentaire, <em style={{ color: '#E9D5AE' }}>simplement</em> plus intelligent.</h1>
        <div className="col mt-24" style={{ gap: 12, color: '#C7D4E8' }}>
          {[['shield', 'Double authentification & sessions révocables'], ['lock', 'Données chiffrées et cloisonnées par cabinet'], ['history', 'Journal d’audit de chaque accès au dossier']].map(([i, t]) => <div key={t} className="row"><Icon name={i} size={18} style={{ color: '#E9D5AE' }} />{t}</div>)}
        </div>
      </div>
      <div className="xs" style={{ opacity: .6, position: 'relative', zIndex: 1 }}>© {new Date().getFullYear()} Nacre — Dental Practice OS</div>
    </aside>
    <main className="login-main">
      <form className="card" style={{ width: '100%', maxWidth: 420, borderRadius: 20, boxShadow: 'var(--shadow-lg)' }} onSubmit={submit}>
        <div className="card-body" style={{ padding: 32 }}>
          <h2 className="serif" style={{ fontSize: 28, color: 'var(--navy)', fontWeight: 500 }}>{mfa ? 'Vérification en deux étapes' : 'Connexion'}</h2>
          <p className="muted mt-4">{mfa ? 'Saisissez le code à 6 chiffres de votre application d’authentification.' : 'Espace cabinet — accès réservé à l’équipe.'}</p>
          {notice && !mfa && <div className="med-alert mt-16" style={{ background: 'var(--warning-50)', color: '#8A5A10', borderColor: '#F3DDB6' }}><Icon name="clock" /><div>{notice}</div></div>}
          <div className="col mt-24" style={{ gap: 14 }}>
            {!mfa ? <>
              <Field label="Email professionnel"><input className="input" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></Field>
              <Field label="Mot de passe"><input className="input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></Field>
            </> : <Field label="Code de vérification"><input className="input otp-input" inputMode="numeric" maxLength={6} autoFocus value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} /></Field>}
            {err && <div className="small" style={{ color: 'var(--danger)' }}>{err}</div>}
            <button className="btn primary lg" disabled={busy}>{busy ? 'Vérification…' : mfa ? 'Valider' : 'Se connecter'}</button>
            {mfa && <button type="button" className="btn ghost" onClick={() => { setMfa(null); setCode(''); }}>Retour</button>}
          </div>
          {import.meta.env.DEV && !mfa && <>
            <div className="divider" />
            <div className="xs muted mb-8">Comptes de démonstration — mot de passe <b className="mono">Nacre2026!</b></div>
            <div className="col gap-6">{DEMO.map(([em, n, r]) => <button type="button" key={em} className="demo-acc" onClick={() => { setEmail(em); setPassword('Nacre2026!'); }}><span className="avatar xs" style={{ background: 'var(--navy)' }}>{n.replace('Dr. ', '')[0]}</span><span className="grow small"><b style={{ fontWeight: 500 }}>{n}</b> <span className="muted">· {r}</span></span></button>)}</div>
          </>}
        </div>
      </form>
    </main>
  </div>;
}
