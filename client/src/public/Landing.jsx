import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { post } from '../lib/api';
import { smile } from '../lib/media';
import { Field, Icon, Modal, Segmented, useUI } from '../ui';
import { BarChart, Donut } from '../ui/charts';
import { BeforeAfter } from '../components/Imaging';
import { fmt } from '../lib/format';

const Check = ({ children }) => <li><Icon name="check" />{children}</li>;
function Reveal({ children, className = '', as: Tag = 'div', ...rest }) {
  const ref = useRef(null); const [inV, setIn] = useState(false);
  useEffect(() => { const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setIn(true); io.disconnect(); } }, { threshold: 0.12 }); if (ref.current) io.observe(ref.current); return () => io.disconnect(); }, []);
  return <Tag ref={ref} className={`reveal ${inV ? 'in' : ''} ${className}`} {...rest}>{children}</Tag>;
}
const TYPE = { consultation: ['#2C6BCB', 'Consultation'], detartrage: ['#3AA6A0', 'Détartrage'], carie: ['#D08A24', 'Soin carie'], controle: ['#5E9F8D', 'Contrôle'], implantologie: ['#12264A', 'Implantologie'], orthodontie: ['#7568D1', 'Orthodontie'] };

export default function Landing() {
  const [scrolled, setScrolled] = useState(false); const [bill, setBill] = useState('m'); const [demo, setDemo] = useState(false);
  useEffect(() => { document.title = 'Nacre — Logiciel de gestion pour cabinets et cliniques dentaires'; document.body.classList.add('site'); const s = () => setScrolled(window.scrollY > 8); window.addEventListener('scroll', s, { passive: true }); return () => { window.removeEventListener('scroll', s); document.body.classList.remove('site'); }; }, []);
  const price = p => fmt.num(bill === 'y' ? Math.round((p * 0.85) / 10) * 10 : p);
  const days = Array.from({ length: 14 }, (_, i) => String(15 + i)); const r = (a, b) => days.map((_, i) => Math.round((a + Math.sin(i * 1.7) * b + (i % 7 === 6 ? -a * 0.8 : 0)) / 50) * 50);
  const openDemo = e => { if (e) e.preventDefault(); setDemo(true); };
  return <div style={{ background: '#FBFBFA' }}>
    <header className={`s-nav ${scrolled ? 'scrolled' : ''}`}><div className="wrap">
      <Link to="/" className="row" style={{ gap: 10, color: 'inherit' }}><span className="brand-mark"><Icon name="tooth" /></span><span><span className="brand-name">Nacre</span><span className="brand-sub" style={{ display: 'block' }}>Dental OS</span></span></Link>
      <nav className="links"><a href="#fonctionnalites">Fonctionnalités</a><a href="#portail">Portail patient</a><a href="#securite">Sécurité</a><a href="#tarifs">Tarifs</a><a href="#faq">FAQ</a></nav>
      <div className="cta"><Link className="btn ghost login" to="/login">Se connecter</Link><button className="btn primary" onClick={openDemo}>Demander une démonstration</button></div>
    </div></header>

    <section className="hero"><div className="wrap hero-grid">
      <div>
        <span className="eyebrow"><Icon name="sparkles" size={14} />Nouveau · Assistant IA administratif intégré</span>
        <h1 className="h-display">Votre cabinet dentaire, <em>simplement</em> plus intelligent.</h1>
        <p className="lead">Patients, rendez-vous, dossiers dentaires, traitements, paiements et gestion du cabinet réunis dans une seule plateforme.</p>
        <div className="ctas"><button className="btn primary lg" onClick={openDemo}>Demander une démonstration</button><Link className="btn lg" to="/login">Commencer gratuitement <Icon name="arrowRight" /></Link></div>
        <div className="trust"><span><Icon name="check" />Essai 30 jours sans engagement</span><span><Icon name="check" />Migration de vos données incluse</span><span><Icon name="check" />Support en français et en arabe</span></div>
      </div>
      <div className="hero-visual">
        <div className="device"><div className="bar"><i /><i /><i /><span className="url">app.nacre.ma/dashboard</span></div>
          <div className="mini">
            <div className="mini-side"><div className="row" style={{ gap: 6, padding: '2px 6px 10px' }}><span className="brand-mark" style={{ width: 20, height: 20, borderRadius: 6 }}><Icon name="tooth" size={12} /></span><b style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--navy)' }}>Nacre</b></div>
              {[['dashboard', 'Dashboard'], ['users', 'Patients'], ['calendar', 'Agenda'], ['tooth', 'Odontogramme'], ['clipboard', 'Plans'], ['receipt', 'Facturation'], ['flask', 'Laboratoire'], ['box', 'Stock'], ['chart', 'Analytics']].map(([i, l], k) => <div key={l} className={`mi ${k === 0 ? 'on' : ''}`}><Icon name={i} />{l}</div>)}</div>
            <div className="mini-main"><div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--navy)', marginBottom: 10 }}>Bonjour, Dr. Bennani</div>
              <div className="mini-kpis"><div className="mini-kpi"><span>RDV aujourd’hui</span><b>24</b></div><div className="mini-kpi"><span>Paiements du jour</span><b>14 750</b></div><div className="mini-kpi"><span>Nouveaux patients</span><b>18</b></div><div className="mini-kpi" style={{ background: 'linear-gradient(180deg,#FFFDF8,#fff)', borderColor: '#EADFC8' }}><span>Revenus du mois</span><b>328 k</b></div></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 8, marginTop: 8 }}>
                <div className="mini-card"><b style={{ fontSize: 11 }}>Planning du jour</b>{[['08:30', 'consultation', 'F. El Amrani', 'Terminé', 'st-termine'], ['09:30', 'detartrage', 'I. Sqalli', 'Terminé', 'st-termine'], ['10:30', 'implantologie', 'K. Mernissi', 'En cours', 'st-encours'], ['14:30', 'carie', 'A. Benali', 'Confirmé', 'st-confirme'], ['15:45', 'controle', 'O. Lahlou', 'En attente', 'st-attente']].map(([t, ty, n, s, c]) => <div key={t} className="mini-row"><span className="t">{t}</span><span className="b" style={{ background: TYPE[ty][0] }} /><span style={{ flex: 1 }}>{TYPE[ty][1]} — {n}</span><span className={`pill ${c}`}>{s}</span></div>)}</div>
                <div className="mini-card"><b style={{ fontSize: 11 }}>Chiffre d’affaires</b><div style={{ marginTop: 6 }}><BarChart labels={['avr.', 'mai', 'juin', 'juil.', 'août', 'sept.']} series={[{ name: 'CA', data: [248, 262, 279, 255, 290, 328].map(v => v * 1000), color: '#2C6BCB' }]} height={150} fmtV={fmt.money} /></div></div>
              </div></div>
          </div></div>
        <div className="float" style={{ left: -26, top: 120 }}><span className="ic tone-green"><Icon name="check" /></span><div><b>Rappel WhatsApp confirmé</b><div className="xs muted">A. Benali · demain 14h30</div></div></div>
        <div className="float" style={{ right: 150, bottom: -4, animationDelay: '-3s' }}><span className="ic tone-gold"><Icon name="card" /></span><div><b>Paiement en ligne reçu</b><div className="xs muted">1 000 DH · acompte couronne</div></div></div>
        <div className="phone" style={{ right: -18, bottom: -30 }}><div className="screen"><div style={{ background: 'linear-gradient(145deg,var(--navy),#1F4585)', color: '#fff', padding: '18px 14px 20px' }}><div style={{ opacity: 0.7 }}>Bonjour</div><b style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 500 }}>Ahmed</b><div style={{ marginTop: 12, background: 'rgba(255,255,255,.12)', borderRadius: 12, padding: 10 }}><div style={{ opacity: 0.7, fontSize: 9 }}>PROCHAIN RENDEZ-VOUS</div><b style={{ fontSize: 12 }}>Aujourd’hui · 14:30</b><div style={{ opacity: 0.8 }}>Dr. Salma Bennani</div></div></div>
          <div style={{ padding: 12, display: 'grid', gap: 8 }}><div className="mini-card"><b>Plan de traitement</b><div className="progress" style={{ marginTop: 6, height: 5 }}><i style={{ width: '66%' }} /></div><div className="muted" style={{ marginTop: 4 }}>4 / 6 actes · reste 3 500 DH</div></div><div className="mini-card row" style={{ gap: 8 }}><span className="avatar xs" style={{ background: 'var(--violet)' }}>Rx</span><div><b>Ordonnance</b><div className="muted">Télécharger le PDF</div></div></div><div className="mini-card row" style={{ gap: 8 }}><span className="avatar xs" style={{ background: 'var(--gold)' }}>DH</span><div><b>Facture à régler</b><div className="muted">Payer en ligne</div></div></div></div></div></div>
      </div>
    </div></section>

    <div className="wrap"><div className="for-strip"><Icon name="star" /><span>Cabinets indépendants</span><span>Cabinets de groupe</span><span>Cliniques multi-praticiens</span><span>Réseaux multi-sites</span><span>Orthodontistes</span><span>Implantologues</span></div></div>

    <section className="s" id="pourquoi"><div className="wrap">
      <Reveal className="s-head"><span className="eyebrow gold">Pourquoi Nacre ?</span><h2 className="h-display">Tout votre cabinet. Une seule plateforme.</h2><p className="lead">Fini les agendas papier, les tableurs et les logiciels qui ne se parlent pas. Nacre réunit le clinique, l’administratif et la relation patient.</p></Reveal>
      <div className="why">{[['layers', 'tone-blue', 'Tout-en-un', 'CRM patient, agenda, odontogramme, devis, facturation, stock, laboratoire et analytics — nativement connectés.'], ['clock', 'tone-sage', 'Du temps rendu au soin', 'Rappels automatiques, documents générés en un clic, assistant IA pour les tâches administratives.'], ['target', 'tone-red', 'Moins de rendez-vous manqués', 'Rappels SMS, email et WhatsApp, confirmation en un clic et rappel renforcé pour les patients à risque.'], ['shield', 'tone-gold', 'Sécurité de niveau médical', '2FA, chiffrement, permissions granulaires, journal d’audit et isolation des données par cabinet.']].map(([i, t, h, p]) => <Reveal key={h} className="card"><div className={`ic ${t}`}><Icon name={i} /></div><h3>{h}</h3><p>{p}</p></Reveal>)}</div>
    </div></section>

    <section className="s" id="fonctionnalites" style={{ paddingTop: 20, background: 'linear-gradient(180deg,#FBFBFA,#F3F6FA 30%,#FBFBFA)' }}><div className="wrap">
      <Reveal className="s-head"><span className="eyebrow">Fonctionnalités</span><h2 className="h-display">Pensé avec des dentistes, pour des dentistes.</h2></Reveal>
      <Feature eyebrow="Gestion des patients" title="Une fiche patient 360°, claire et complète." text="Identité, informations administratives, antécédents et allergies déclarés, consultations, radiographies, ordonnances, factures et rendez-vous : tout est à portée de main." checks={['Alerte allergies visible par toute l’équipe soignante', 'Dossier dentaire structuré et historique chronologique', 'Recherche instantanée par nom, téléphone ou n° de dossier']}>
        <div className="row" style={{ gap: 14 }}><span className="avatar lg" style={{ background: '#2C6BCB' }}>AB</span><div><b className="serif" style={{ fontSize: 22, color: 'var(--navy)' }}>Ahmed Benali</b><div className="small muted">42 ans · DOS-01040 · Dr. Salma Bennani</div><div className="row gap-6 mt-8"><span className="tag">Fidèle</span><span className="tag gold">VIP</span></div></div></div>
        <div className="med-alert mt-16"><Icon name="alert" /><div><b>Allergie déclarée : Pénicilline</b> · Diabète de type 2 (déclaré)</div></div>
        <div className="grid g4 mt-16" style={{ gap: 8 }}>{[['Consultations', '4'], ['Prochain RDV', 'Auj. 14:30'], ['Plan', '4 / 6 actes'], ['Reste', '3 500']].map(([l, v]) => <div key={l} className="mini-card"><span className="xs muted">{l}</span><b style={{ display: 'block', fontSize: 15 }}>{v}</b></div>)}</div>
      </Feature>
      <Feature rev eyebrow="Agenda intelligent" title="Un agenda qui se remplit — et se tient." text="Vues jour, semaine, mois, par praticien ou par fauteuil. Glissez-déposez pour déplacer : le patient est notifié automatiquement." checks={['Détection des conflits et créneaux libres en temps réel', 'Prise de rendez-vous en ligne 24h/24 synchronisée', 'Rappels 24h et 3h avant, par SMS, email ou WhatsApp']}>
        <div className="row between" style={{ marginBottom: 12 }}><b>Lundi</b><Segmented value="j" onChange={() => { }} options={[['j', 'Jour'], ['s', 'Semaine'], ['m', 'Mois']]} /></div>
        <div className="col gap-6">{[['09:00', 'consultation', 'F. El Amrani', 'Dr. Bennani'], ['09:30', 'implantologie', 'K. Mernissi', 'Dr. Alaoui'], ['10:00', 'orthodontie', 'A. Filali', 'Dr. Tazi'], ['11:15', 'carie', 'M. Kettani', 'Dr. Bennani']].map(([t, ty, n, d]) => <div key={t} className="appt" style={{ position: 'static', background: TYPE[ty][0] + '14', borderLeftColor: TYPE[ty][0], cursor: 'default' }}><b>{t} · {n}</b><div className="at">{TYPE[ty][1]} · {d}</div></div>)}</div>
      </Feature>
      <Feature eyebrow="Odontogramme interactif" title="Le schéma dentaire, enfin numérique et vivant." text="Sélectionnez une dent, indiquez carie, obturation, couronne, implant, endodontie… Distinguez situation initiale, traitement prévu et réalisé." checks={['Numérotation FDI · 5 faces par dent', 'Un clic pour ajouter l’acte au plan de traitement', 'Chaque modification horodatée dans l’historique']}>
        <div className="odonto-legend" style={{ marginTop: 0 }}>{[['#CF4759', 'Carie'], ['#2C6BCB', 'Obturation'], ['#B89457', 'Couronne'], ['#12264A', 'Implant'], ['#7568D1', 'Endodontie'], ['#D08A24', 'Problème gingival']].map(([c, l]) => <span key={l}><i style={{ background: c }} />{l}</span>)}</div>
        <div className="row wrap mt-16" style={{ gap: 6 }}>{['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'].map(n => <span key={n} className="badge" style={{ background: { 16: '#F6EEDC', 14: 'var(--danger-50)', 26: 'var(--violet-50)', 24: '#E8EDF6' }[n] || 'var(--bg-2)', color: 'var(--ink-2)' }}>{n}</span>)}</div>
      </Feature>
      <Feature rev eyebrow="Plans de traitement & devis" title="Des devis clairs, acceptés en ligne." text="Construisez le plan acte par acte, générez un devis PDF à votre en-tête et laissez le patient l’accepter depuis son espace, avec signature électronique." checks={['Proposé → Accepté → Planifié → En cours → Terminé', 'Suivi du payé et du reste à payer par acte', 'Conversion devis → plan → facture en un clic']}>
        <table className="table" style={{ fontSize: 12.5 }}><tbody>{[['Consultation', '—', '300 DH', 'Terminé', 'st-termine'], ['Détartrage', '—', '400 DH', 'Terminé', 'st-termine'], ['Traitement carie', '26', '600 DH', 'Terminé', 'st-termine'], ['Traitement endodontique', '36', '1 200 DH', 'Terminé', 'st-termine'], ['Couronne zircone', '36', '3 500 DH', 'En cours', 'st-encours'], ['Blanchiment', '11–21', '2 500 DH', 'Planifié', 'st-confirme']].map(r => <tr key={r[0]}><td>{r[0]}</td><td className="muted">{r[1]}</td><td className="num">{r[2]}</td><td><span className={`badge ${r[4]}`}>{r[3]}</span></td></tr>)}</tbody></table>
        <div className="grid g3 mt-12" style={{ gap: 8 }}><div className="mini-card"><span className="xs muted">Total traitement</span><b style={{ display: 'block', fontSize: 16 }}>8 500 DH</b></div><div className="mini-card" style={{ background: 'var(--success-50)' }}><span className="xs muted">Payé</span><b style={{ display: 'block', fontSize: 16, color: 'var(--success)' }}>5 000 DH</b></div><div className="mini-card" style={{ background: 'var(--danger-50)' }}><span className="xs muted">Reste</span><b style={{ display: 'block', fontSize: 16, color: 'var(--danger)' }}>3 500 DH</b></div></div>
      </Feature>
      <Feature eyebrow="Facturation & paiements" title="Encaissez plus vite, relancez moins." text="Factures, acomptes, remises, remboursements et paiement en ligne. Espèces, carte, virement : chaque encaissement est rapproché." checks={['Suivi des impayés par ancienneté', 'Rappels de paiement automatiques', 'Exports comptables en un clic']}>
        <b>Encaissements — 14 derniers jours</b><div className="mt-12"><BarChart labels={days} stacked height={220} fmtV={fmt.money} series={[['Espèces', '#5E9F8D', r(3200, 1200)], ['Carte', '#2C6BCB', r(5200, 1800)], ['Virement', '#12264A', r(2400, 1500)], ['En ligne', '#B89457', r(1500, 700)]].map(([name, color, data]) => ({ name, color, data }))} /></div>
      </Feature>
      <Feature rev eyebrow="Stock, fournisseurs & laboratoire" title="Plus jamais à court d’anesthésique." text="Seuils minimums, dates d’expiration, commandes fournisseurs avec mise à jour automatique du stock, et suivi des travaux de laboratoire jusqu’à la pose." checks={['Alertes stock faible et produits bientôt expirés', 'Commandes Brouillon → Commandée → Reçue', 'Notification quand le laboratoire signale « prêt »']}>
        <div className="kanban" style={{ gridAutoColumns: 'minmax(140px,1fr)', fontSize: 12 }}>{[['Envoyé', 'st-confirme', [['Appareil ortho', 'Maxillaire · A. Filali']]], ['En fabrication', 'st-attente', [['Facettes 12, 22', 'BL3 · L. Benjelloun']]], ['Prêt', 'tone-teal', [['Prothèse amovible', 'R. Ouazzani']]]].map(([h, c, items]) => <div key={h} className="kcol" style={{ minHeight: 160 }}><div className="kcol-head"><span className={`badge ${c}`}>{h}</span></div>{items.map(([t, s]) => <div key={t} className="kcard"><b>{t}</b><div className="xs muted">{s}</div></div>)}</div>)}</div>
        <div className="med-alert mt-12" style={{ background: 'var(--warning-50)', color: '#8A5A10', borderColor: '#F3DDB6' }}><Icon name="box" /><div><b>Stock faible :</b> Articaïne 4 % — 9 boîtes (seuil 12)</div></div>
      </Feature>
      <Feature eyebrow="Analytics" title="Pilotez votre activité avec des chiffres clairs." text="Consultations, taux de remplissage, no-show, chiffre d’affaires par traitement, fidélisation et acceptation des plans — par praticien et par site." checks={['Tableau de bord direction multi-cabinets', 'Graphiques interactifs et exports CSV', 'Satisfaction patient et avis']}>
        <div className="row between"><b>Activité par type de soin</b><span className="xs muted">Ce mois</span></div><div className="mt-12"><Donut data={[['Consultation', 142, '#2C6BCB'], ['Détartrage', 88, '#3AA6A0'], ['Soin carie', 76, '#D08A24'], ['Orthodontie', 64, '#7568D1'], ['Prothèse', 31, '#B89457'], ['Implantologie', 12, '#12264A']].map(([label, value, color]) => ({ label, value, color }))} center="413" sub="RDV" /></div>
      </Feature>
    </div></section>

    <section className="s" id="portail"><div className="wrap"><div className="feature" style={{ padding: 0 }}>
      <Reveal className="f-text"><span className="eyebrow gold">Portail patient</span><h3>Vos patients ont leur espace — sur le web et sur mobile.</h3><p>Prise et modification de rendez-vous, rappels, plan de traitement, devis à accepter, ordonnances à télécharger, factures et paiement en ligne, messagerie sécurisée.</p>
        <ul className="checks"><Check>Réservation en ligne des seuls créneaux disponibles</Check><Check>Envoi de documents par le patient</Check><Check>Photos avant/après privées, partagées uniquement avec consentement</Check></ul>
        <div className="row wrap mt-24"><Link className="btn primary" to="/portail">Voir le portail patient</Link><Link className="btn" to="/rdv">Tester la prise de RDV</Link></div></Reveal>
      <Reveal className="f-visual"><div className="panel"><div className="row between mb-12"><b>Avant / Après</b><span className="badge tone-gold"><Icon name="lock" size={11} />Privé</span></div><BeforeAfter before={smile('#E9D6A8', 4, true)} after={smile('#FBF8F1', 4, false)} /><p className="xs muted mt-8">Faites glisser pour comparer · Facettes céramiques 11–21</p></div></Reveal>
    </div></div></section>

    <section className="s dark" id="securite"><div className="wrap">
      <Reveal className="s-head"><span className="eyebrow gold">Sécurité & confidentialité</span><h2 className="h-display">Les données de santé méritent le plus haut niveau de protection.</h2><p className="lead">Nacre est conçu pour permettre votre conformité aux exigences applicables dans votre pays de déploiement.</p></Reveal>
      <div className="sec-grid">{[['fingerprint', 'Authentification forte', 'Double authentification (2FA), gestion et révocation des sessions, expiration automatique.'], ['key', 'RBAC & permissions granulaires', 'Administrateur, dentiste, assistant(e), secrétaire, comptable, gestionnaire : chacun voit ce qu’il doit voir.'], ['lock', 'Chiffrement', 'Données chiffrées au repos et en transit. Clés gérées séparément.'], ['history', 'Journal d’audit', 'Qui a consulté ou modifié quel dossier, et quand. Historique des modifications cliniques.'], ['database', 'Sauvegardes', 'Sauvegardes quotidiennes chiffrées, rétention 35 jours, réplication hors site.'], ['layers', 'Isolation multi-cabinets', 'Chaque établissement est cloisonné ; la direction dispose d’une vue consolidée.']].map(([i, t, p]) => <Reveal key={t} className="sec-item"><Icon name={i} /><b>{t}</b><p>{p}</p></Reveal>)}</div>
    </div></section>

    <section className="s" id="tarifs"><div className="wrap">
      <Reveal className="s-head"><span className="eyebrow">Tarifs</span><h2 className="h-display">Un tarif simple, qui grandit avec vous.</h2><p className="lead">Sans frais d’installation. Migration et formation incluses.</p></Reveal>
      <div style={{ textAlign: 'center' }}><div className="billing-toggle"><Segmented value={bill} onChange={setBill} options={[['m', 'Mensuel'], ['y', 'Annuel −15 %']]} /></div></div>
      <div className="prices">
        <Reveal className="price"><h4>Essentiel</h4><p className="desc">Pour le praticien indépendant qui se lance.</p><div className="amt">{price(490)} <small>DH / mois</small></div><div className="xs muted">1 praticien · 2 utilisateurs</div><ul><Check>Patients & dossier dentaire</Check><Check>Agenda & rappels SMS</Check><Check>Odontogramme</Check><Check>Devis & facturation</Check></ul><Link className="btn" to="/login">Commencer</Link></Reveal>
        <Reveal className="price pop"><span className="flag">Le plus choisi</span><h4>Cabinet</h4><p className="desc">Pour les cabinets de 2 à 4 praticiens.</p><div className="amt">{price(990)} <small>DH / mois</small></div><div className="xs muted">jusqu’à 4 praticiens · 8 utilisateurs</div><ul><Check>Tout Essentiel +</Check><Check>Portail patient & RDV en ligne</Check><Check>WhatsApp & rappels renforcés</Check><Check>Stock, fournisseurs, laboratoire</Check><Check>Analytics</Check></ul><Link className="btn primary" to="/login">Essai gratuit 30 jours</Link></Reveal>
        <Reveal className="price premium"><h4>Clinique</h4><p className="desc">Pour les cliniques multi-praticiens exigeantes.</p><div className="amt">{price(1990)} <small>DH / mois</small></div><div className="xs muted">praticiens illimités · 20 utilisateurs</div><ul><Check>Tout Cabinet +</Check><Check>Assistant IA administratif</Check><Check>Orthodontie & avant/après</Check><Check>Permissions granulaires avancées</Check><Check>Support prioritaire</Check></ul><Link className="btn gold" to="/login">Essai gratuit 30 jours</Link></Reveal>
        <Reveal className="price"><h4>Groupe</h4><p className="desc">Pour les réseaux multi-sites.</p><div className="amt" style={{ fontSize: 32 }}>Sur devis</div><div className="xs muted">sites et utilisateurs illimités</div><ul><Check>Tout Clinique +</Check><Check>Multi-cabinets & vue direction</Check><Check>SSO & exigences de sécurité sur mesure</Check><Check>Accompagnement dédié</Check></ul><button className="btn" onClick={openDemo}>Nous contacter</button></Reveal>
      </div>
    </div></section>

    <section className="s" id="faq" style={{ paddingTop: 20 }}><div className="wrap">
      <Reveal className="s-head"><span className="eyebrow">FAQ</span><h2 className="h-display">Questions fréquentes</h2></Reveal>
      <div className="faq">{[['Puis-je importer les données de mon logiciel actuel ?', 'Oui. Notre équipe prend en charge la migration de vos patients, rendez-vous, historiques et soldes depuis la plupart des logiciels du marché ou depuis des fichiers Excel, sans frais supplémentaires.'], ['Mes données sont-elles sécurisées ?', 'Les données sont chiffrées, l’accès est protégé par double authentification et des permissions par rôle appliquées côté serveur, et chaque consultation de dossier est tracée. Les sauvegardes sont quotidiennes et chiffrées.'], ['L’assistant IA pose-t-il des diagnostics ?', 'Non. L’assistant est dédié aux tâches administratives et organisationnelles : résumer des notes saisies par le praticien, préparer des comptes rendus, générer des rappels, identifier les suivis. Il ne pose aucun diagnostic et ne remplace pas le jugement du professionnel de santé.'], ['Nacre fonctionne-t-il sur téléphone et tablette ?', 'Oui. L’interface est entièrement responsive : consultez votre agenda, une fiche patient, un plan de traitement ou les paiements depuis votre téléphone. Vos patients disposent également de leur espace mobile.'], ['Est-ce adapté à plusieurs cabinets ?', 'Oui. L’architecture multi-tenant permet de gérer plusieurs établissements, chacun avec ses patients, praticiens, agenda, stock et finances, avec un tableau de bord global pour la direction.'], ['Les rappels WhatsApp sont-ils inclus ?', 'Les rappels SMS et email sont inclus dès l’offre Essentiel. WhatsApp est disponible à partir de l’offre Cabinet via l’intégration WhatsApp Business, selon disponibilité dans votre pays.']].map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
    </div></section>

    <section className="s" style={{ paddingTop: 20 }}><div className="wrap"><Reveal className="cta-final"><span className="eyebrow gold" style={{ position: 'relative', zIndex: 1 }}>Prêt à simplifier votre cabinet ?</span><h2 className="h-display mt-16" style={{ position: 'relative', zIndex: 1 }}>Offrez à votre équipe l’outil qu’elle mérite.</h2><p className="lead mt-12" style={{ color: '#C7D4E8', position: 'relative', zIndex: 1 }}>Démonstration personnalisée de 30 minutes avec un expert.</p><div className="row wrap mt-24" style={{ justifyContent: 'center', position: 'relative', zIndex: 1 }}><button className="btn gold lg" onClick={openDemo}>Demander une démonstration</button><Link className="btn lg" to="/login" style={{ background: 'rgba(255,255,255,.1)', borderColor: 'rgba(255,255,255,.2)', color: '#fff' }}>Explorer la démo</Link></div></Reveal></div></section>

    <footer className="s-foot"><div className="wrap">
      <div className="foot-grid"><div><div className="row" style={{ gap: 10 }}><span className="brand-mark"><Icon name="tooth" /></span><span className="brand-name">Nacre</span></div><p className="mt-12" style={{ maxWidth: 300 }}>La plateforme de gestion pensée pour les cabinets et cliniques dentaires.</p></div>
        <div><h5>Produit</h5><a href="#fonctionnalites">Fonctionnalités</a><a href="#tarifs">Tarifs</a><Link to="/login">Espace cabinet</Link><Link to="/portail">Portail patient</Link></div>
        <div><h5>Ressources</h5><a href="#faq">FAQ</a><a href="#securite">Sécurité</a><Link to="/rdv">Prise de RDV en ligne</Link></div>
        <div><h5>Contact</h5><a href="#contact" onClick={openDemo}>Demander une démo</a><a href="mailto:contact@nacre.ma">contact@nacre.ma</a></div></div>
      <div className="row between wrap mt-24" style={{ paddingTop: 20, borderTop: '1px solid var(--line)' }}><span>© {new Date().getFullYear()} Nacre — Dental Practice OS</span><span>Mentions légales · Confidentialité · CGU</span></div>
    </div></footer>
    {demo && <DemoModal onClose={() => setDemo(false)} />}
  </div>;
}

function Feature({ eyebrow, title, text, checks, children, rev }) {
  return <div className={`feature ${rev ? 'rev' : ''}`}>
    <Reveal className="f-text"><span className="eyebrow">{eyebrow}</span><h3>{title}</h3><p>{text}</p><ul className="checks">{checks.map(c => <Check key={c}>{c}</Check>)}</ul></Reveal>
    <Reveal className="f-visual"><div className="panel">{children}</div></Reveal>
  </div>;
}

function DemoModal({ onClose }) {
  const { toast } = useUI(); const [f, setF] = useState({ name: '', cabinet: '', city: '', size: '1', phone: '', email: '', msg: '', website: '' }); const [done, setDone] = useState(false); const [busy, setBusy] = useState(false);
  const b = k => ({ value: f[k], onChange: e => setF(s => ({ ...s, [k]: e.target.value })) });
  const send = async () => { setBusy(true); try { await post('/public/demo-request', f); setDone(true); } catch (e) { toast(e.message, 'alert'); } finally { setBusy(false); } };
  return <Modal title="Demander une démonstration" onClose={onClose} footer={!done && <><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" disabled={busy || !f.name || !f.phone} onClick={send}>Envoyer la demande</button></>}>
    {done ? <div className="center" style={{ padding: '20px 0' }}><div className="success-mark"><Icon name="check" /></div><h3 className="serif" style={{ fontSize: 22, color: 'var(--navy)' }}>Merci {f.name.split(' ')[0]} !</h3><p className="muted mt-8">Votre demande a bien été enregistrée. Nous vous contactons très vite au {f.phone}.</p><Link className="btn primary mt-16" to="/login">Explorer la démo en attendant</Link></div>
      : <><p className="muted small mb-16">Un expert Nacre vous rappelle sous 24h ouvrées pour organiser une démonstration personnalisée de 30 minutes.</p>
        <div className="form-grid"><Field label="Nom complet *"><input className="input" autoFocus {...b('name')} /></Field><Field label="Cabinet / clinique"><input className="input" {...b('cabinet')} /></Field><Field label="Ville"><input className="input" {...b('city')} /></Field><Field label="Nombre de praticiens"><select className="select" {...b('size')}><option>1</option><option>2 à 4</option><option>5 à 10</option><option>Plus de 10 / multi-sites</option></select></Field><Field label="Téléphone *"><input className="input" {...b('phone')} /></Field><Field label="Email"><input className="input" type="email" {...b('email')} /></Field><Field label="Votre besoin" full><textarea className="textarea" placeholder="Logiciel actuel, priorités…" {...b('msg')} /></Field>
          <input type="text" tabIndex={-1} autoComplete="off" style={{ display: 'none' }} {...b('website')} /></div></>}
  </Modal>;
}
