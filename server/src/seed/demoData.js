/* =========================================================
   Nacre — Store & données de démonstration
   Toutes les pages (app, portail, réservation) partagent ce store
   via localStorage. En production : API REST + base multi-tenant.
   ========================================================= */
(function () {
  const KEY = 'nacre.store.v6';

  /* ---------- Dates ---------- */
  const pad = n => String(n).padStart(2, '0');
  const D = {
    ymd: d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    parse: s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); },
    add: (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; },
    addYmd: (s, n) => D.ymd(D.add(D.parse(s), n)),
    today: () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; },
    todayYmd: () => D.ymd(new Date()),
    min: t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; },
    hm: m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`,
    nowMin: () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); },
    diffDays: (a, b) => Math.round((D.parse(b) - D.parse(a)) / 864e5),
    monday: d => { const x = new Date(d); const w = (x.getDay() + 6) % 7; x.setDate(x.getDate() - w); x.setHours(0, 0, 0, 0); return x; },
    stamp: () => new Date().toISOString()
  };

  /* ---------- PRNG déterministe ---------- */
  let seed = 20260928;
  const R = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pick = a => a[Math.floor(R() * a.length)];
  const chance = p => R() < p;
  const int = (a, b) => a + Math.floor(R() * (b - a + 1));

  /* ---------- Référentiels ---------- */
  const TYPES = {
    consultation: { label: 'Consultation', color: '#2C6BCB', dur: 30, price: 300 },
    controle: { label: 'Contrôle', color: '#5E9F8D', dur: 20, price: 200 },
    detartrage: { label: 'Détartrage', color: '#3AA6A0', dur: 45, price: 400 },
    carie: { label: 'Soin carie', color: '#D08A24', dur: 45, price: 600 },
    extraction: { label: 'Extraction', color: '#CF4759', dur: 40, price: 500 },
    implantologie: { label: 'Implantologie', color: '#12264A', dur: 90, price: 8000 },
    orthodontie: { label: 'Orthodontie', color: '#7568D1', dur: 30, price: 500 },
    prothese: { label: 'Prothèse', color: '#B89457', dur: 60, price: 3500 },
    chirurgie: { label: 'Chirurgie', color: '#A5467A', dur: 75, price: 2500 },
    urgence: { label: 'Urgence', color: '#E0582F', dur: 30, price: 400 }
  };
  const STATUS = {
    confirme: { label: 'Confirmé', cls: 'st-confirme', color: '#2C6BCB' },
    attente: { label: 'En attente', cls: 'st-attente', color: '#D08A24' },
    encours: { label: 'En cours', cls: 'st-encours', color: '#3AA6A0' },
    termine: { label: 'Terminé', cls: 'st-termine', color: '#2E9C6E' },
    annule: { label: 'Annulé', cls: 'st-annule', color: '#9AA5B4' },
    noshow: { label: 'No-show', cls: 'st-noshow', color: '#CF4759' }
  };
  const ACTS = [
    { code: 'CONS', label: 'Consultation', price: 300 },
    { code: 'CTRL', label: 'Contrôle', price: 200 },
    { code: 'DET', label: 'Détartrage & polissage', price: 400 },
    { code: 'CAR', label: 'Traitement carie (composite)', price: 600 },
    { code: 'ENDO', label: 'Traitement endodontique', price: 1200 },
    { code: 'EXT', label: 'Extraction simple', price: 500 },
    { code: 'EXTC', label: 'Extraction chirurgicale', price: 1500 },
    { code: 'CCM', label: 'Couronne céramo-métallique', price: 2800 },
    { code: 'CZR', label: 'Couronne zircone', price: 3500 },
    { code: 'INL', label: 'Inlay-core', price: 1200 },
    { code: 'IMP', label: 'Implant (pose)', price: 8000 },
    { code: 'BRI', label: 'Bridge 3 éléments', price: 9000 },
    { code: 'FAC', label: 'Facette céramique', price: 3800 },
    { code: 'BLA', label: 'Blanchiment', price: 2500 },
    { code: 'PAP', label: 'Prothèse amovible partielle', price: 4500 },
    { code: 'ORTHO', label: 'Traitement orthodontique (forfait)', price: 18000 },
    { code: 'RAD', label: 'Radiographie panoramique', price: 250 },
    { code: 'SURF', label: 'Surfaçage radiculaire (quadrant)', price: 700 }
  ];

  const CLINICS = [
    { id: 'fes', name: 'Cabinet Fès', city: 'Fès', address: '12 Avenue Hassan II, Fès', phone: '05 35 62 10 10', chairs: ['Fauteuil 1', 'Fauteuil 2', 'Fauteuil 3'] },
    { id: 'meknes', name: 'Cabinet Meknès', city: 'Meknès', address: '45 Boulevard Mohammed V, Meknès', phone: '05 35 52 20 20', chairs: ['Fauteuil 1', 'Fauteuil 2'] },
    { id: 'rabat', name: 'Cabinet Rabat', city: 'Rabat', address: '8 Rue Patrice Lumumba, Agdal, Rabat', phone: '05 37 68 30 30', chairs: ['Fauteuil 1', 'Fauteuil 2'] }
  ];

  const STAFF = [
    { id: 'd1', first: 'Salma', last: 'Bennani', title: 'Dr.', role: 'dentiste', admin: true, spec: 'Omnipratique & esthétique', clinic: 'fes', chair: 'Fauteuil 1', color: '#2C6BCB', email: 's.bennani@atlas-dentaire.ma', phone: '06 61 10 20 30', twofa: true },
    { id: 'd2', first: 'Youssef', last: 'Alaoui', title: 'Dr.', role: 'dentiste', spec: 'Implantologie & chirurgie', clinic: 'fes', chair: 'Fauteuil 2', color: '#12264A', email: 'y.alaoui@atlas-dentaire.ma', phone: '06 62 11 21 31', twofa: true },
    { id: 'd3', first: 'Nadia', last: 'Tazi', title: 'Dr.', role: 'dentiste', spec: 'Orthodontie', clinic: 'fes', chair: 'Fauteuil 3', color: '#7568D1', email: 'n.tazi@atlas-dentaire.ma', phone: '06 63 12 22 32', twofa: true },
    { id: 'd4', first: 'Karim', last: 'Idrissi', title: 'Dr.', role: 'dentiste', spec: 'Endodontie & prothèse', clinic: 'meknes', chair: 'Fauteuil 1', color: '#3AA6A0', email: 'k.idrissi@atlas-dentaire.ma', phone: '06 64 13 23 33', twofa: false },
    { id: 'd5', first: 'Amine', last: 'Berrada', title: 'Dr.', role: 'dentiste', spec: 'Omnipratique & parodontologie', clinic: 'rabat', chair: 'Fauteuil 1', color: '#B89457', email: 'a.berrada@atlas-dentaire.ma', phone: '06 65 14 24 34', twofa: true },
    { id: 's1', first: 'Mounia', last: 'Rahmani', title: '', role: 'secretaire', clinic: 'fes', color: '#5E9F8D', email: 'accueil.fes@atlas-dentaire.ma', phone: '06 70 10 10 10', twofa: true },
    { id: 's2', first: 'Hajar', last: 'Ziani', title: '', role: 'assistant', clinic: 'fes', color: '#D08A24', email: 'h.ziani@atlas-dentaire.ma', phone: '06 70 20 20 20', twofa: false },
    { id: 's3', first: 'Adil', last: 'Benomar', title: '', role: 'comptable', clinic: 'all', color: '#A5467A', email: 'compta@atlas-dentaire.ma', phone: '06 70 30 30 30', twofa: true },
    { id: 's4', first: 'Samira', last: 'Kabbaj', title: '', role: 'gestionnaire', clinic: 'fes', color: '#E0582F', email: 's.kabbaj@atlas-dentaire.ma', phone: '06 70 40 40 40', twofa: true },
    { id: 's5', first: 'Rachid', last: 'El Ouali', title: '', role: 'admin', clinic: 'all', color: '#12264A', email: 'direction@atlas-dentaire.ma', phone: '06 70 50 50 50', twofa: true },
    { id: 's6', first: 'Ghita', last: 'Amrani', title: '', role: 'secretaire', clinic: 'meknes', color: '#5E9F8D', email: 'accueil.meknes@atlas-dentaire.ma', phone: '06 70 60 60 60', twofa: false }
  ];

  const ROLES = {
    admin: 'Administrateur', dentiste: 'Dentiste', assistant: 'Assistant(e)', secretaire: 'Secrétaire', comptable: 'Comptable', gestionnaire: 'Gestionnaire'
  };
  const PERMS = [
    ['agenda.view', 'Voir l’agenda'], ['agenda.manage', 'Gérer les rendez-vous'],
    ['patients.view', 'Voir les patients'], ['patients.edit', 'Modifier les fiches administratives'],
    ['clinical.view', 'Voir les données cliniques'], ['clinical.edit', 'Modifier les données cliniques'],
    ['images.private', 'Photos avant/après (privées)'],
    ['finance.view', 'Voir la facturation'], ['finance.edit', 'Encaisser / facturer'],
    ['stock.manage', 'Stock & fournisseurs'], ['lab.manage', 'Laboratoire'],
    ['comm.send', 'Communication patient'], ['analytics.view', 'Analytics'],
    ['staff.manage', 'Gérer le personnel'], ['settings.manage', 'Paramètres & sécurité']
  ];
  const ALL = PERMS.map(p => p[0]);
  const ROLE_PERMS = {
    admin: ALL.slice(),
    dentiste: ['agenda.view', 'agenda.manage', 'patients.view', 'patients.edit', 'clinical.view', 'clinical.edit', 'images.private', 'finance.view', 'lab.manage', 'comm.send', 'analytics.view'],
    assistant: ['agenda.view', 'agenda.manage', 'patients.view', 'clinical.view', 'stock.manage', 'lab.manage', 'comm.send'],
    secretaire: ['agenda.view', 'agenda.manage', 'patients.view', 'patients.edit', 'finance.view', 'finance.edit', 'comm.send'],
    comptable: ['patients.view', 'finance.view', 'finance.edit', 'analytics.view', 'stock.manage'],
    gestionnaire: ['agenda.view', 'patients.view', 'stock.manage', 'lab.manage', 'analytics.view', 'staff.manage']
  };
  const ROLE_USER = { admin: 'd1', dentiste: 'd2', assistant: 's2', secretaire: 's1', comptable: 's3', gestionnaire: 's4' };

  /* ---------- Patients ---------- */
  const PEOPLE = [
    ['Ahmed', 'Benali', 'M', '1984-03-12', 'Ingénieur informatique', 'fes'],
    ['Fatima Zahra', 'El Amrani', 'F', '1991-07-22', 'Enseignante', 'fes'],
    ['Youssef', 'Chraibi', 'M', '1976-11-05', 'Commerçant', 'fes'],
    ['Khadija', 'Berrada', 'F', '1968-02-14', 'Pharmacienne', 'fes'],
    ['Omar', 'Lahlou', 'M', '1989-09-30', 'Architecte', 'fes'],
    ['Imane', 'Sqalli', 'F', '1995-05-18', 'Chargée de communication', 'fes'],
    ['Mehdi', 'Kettani', 'M', '1981-01-09', 'Avocat', 'fes'],
    ['Sara', 'Bennis', 'F', '1999-12-02', 'Étudiante', 'fes'],
    ['Hamza', 'El Fassi', 'M', '1972-06-25', 'Chef d’entreprise', 'fes'],
    ['Nour El Houda', 'Alami', 'F', '1987-04-11', 'Infirmière', 'fes'],
    ['Rachid', 'Ouazzani', 'M', '1959-08-19', 'Retraité', 'fes'],
    ['Leila', 'Benjelloun', 'F', '1985-10-03', 'Designer', 'fes'],
    ['Adam', 'Filali', 'M', '2013-03-27', 'Collégien', 'fes'],
    ['Yasmine', 'Skalli', 'F', '2009-06-14', 'Lycéenne', 'fes'],
    ['Karim', 'Mernissi', 'M', '1970-12-21', 'Banquier', 'fes'],
    ['Houda', 'Naciri', 'F', '1993-02-08', 'Comptable', 'fes'],
    ['Anas', 'Bouzidi', 'M', '1997-09-15', 'Développeur', 'fes'],
    ['Meryem', 'Lazrak', 'F', '1979-05-29', 'Médecin généraliste', 'fes'],
    ['Ilyas', 'Guessous', 'M', '2011-11-11', 'Collégien', 'fes'],
    ['Aya', 'Hajji', 'F', '2014-01-20', 'Écolière', 'fes'],
    ['Zineb', 'Tahiri', 'F', '1990-03-05', 'Pharmacienne', 'meknes'],
    ['Hicham', 'Sefrioui', 'M', '1966-07-17', 'Agriculteur', 'meknes'],
    ['Soukaina', 'Rami', 'F', '1994-08-23', 'Kinésithérapeute', 'meknes'],
    ['Mohamed', 'Cherkaoui', 'M', '1975-04-02', 'Fonctionnaire', 'rabat'],
    ['Nadia', 'El Mansouri', 'F', '1983-12-12', 'Journaliste', 'rabat'],
    ['Othmane', 'Benkirane', 'M', '1992-10-28', 'Consultant', 'rabat']
  ];
  const STREETS = ['Rue Ibn Khaldoun', 'Avenue des FAR', 'Boulevard Allal El Fassi', 'Rue Oued Fès', 'Avenue Moulay Youssef', 'Résidence Al Andalous', 'Quartier Narjiss', 'Route d’Imouzzer', 'Rue Abou Bakr Seddik'];
  const COVER = ['CNOPS', 'CNSS (AMO)', 'Mutuelle privée', 'Sans couverture', 'CNSS (AMO)', 'Assurance privée'];
  const HIST = ['Aucun antécédent notable déclaré', 'Hypertension artérielle (déclarée, traitée)', 'Asthme léger (déclaré)', 'Diabète de type 2 (déclaré)', 'Hypothyroïdie (déclarée)', 'Aucun antécédent notable déclaré', 'Aucun antécédent notable déclaré'];
  const ALLERG = [[], [], [], ['Latex'], [], ['Pénicilline'], [], ['Aspirine'], [], []];
  const MEDS = { 'Hypertension artérielle (déclarée, traitée)': ['Amlodipine 5 mg'], 'Asthme léger (déclaré)': ['Salbutamol (si besoin)'], 'Diabète de type 2 (déclaré)': ['Metformine 850 mg'], 'Hypothyroïdie (déclarée)': ['Lévothyroxine 75 µg'] };
  const AV = ['#2C6BCB', '#5E9F8D', '#7568D1', '#B89457', '#3AA6A0', '#12264A', '#A5467A', '#D08A24', '#4B7BB5', '#6C8C5A'];

  const FN_M = ['Mohamed', 'Yassine', 'Amine', 'Hassan', 'Said', 'Khalid', 'Nabil', 'Tarik', 'Reda', 'Badr', 'Ismail', 'Zakaria', 'Hamid', 'Abdellah', 'Soufiane', 'Ayoub', 'Driss', 'Jamal', 'Walid', 'Samir'];
  const FN_F = ['Salma', 'Hajar', 'Asmae', 'Ghita', 'Kawtar', 'Rim', 'Hanane', 'Latifa', 'Loubna', 'Malak', 'Najat', 'Oumaima', 'Siham', 'Wiam', 'Yousra', 'Chaimae', 'Btissam', 'Ikram', 'Dounia', 'Fadwa'];
  const LN = ['Amrani', 'Belkadi', 'Bennouna', 'Chami', 'Daoudi', 'El Khatib', 'Essafi', 'Fassi Fihri', 'Ghazali', 'Hakimi', 'Idrissi', 'Jabri', 'Kadiri', 'Lamrani', 'Mansouri', 'Naji', 'Ouali', 'Rhazi', 'Saidi', 'Tounsi', 'Zerhouni', 'Bekkali', 'Cherradi', 'El Ouazzani', 'Iraqi', 'Mouline', 'Sbai', 'Tazi Mezalek', 'Benchekroun', 'Alaoui Mdaghri'];
  const JOBS = ['Enseignant(e)', 'Ingénieur(e)', 'Commerçant(e)', 'Étudiant(e)', 'Fonctionnaire', 'Infirmier(ère)', 'Retraité(e)', 'Comptable', 'Artisan', 'Chef de projet', 'Médecin', 'Avocat(e)', 'Employé(e)', 'Architecte', 'Pharmacien(ne)'];
  function extraPeople() {
    const out = [];
    for (let i = 0; i < 144; i++) {
      const f = chance(.52); const y = int(1950, 2016);
      out.push([pick(f ? FN_F : FN_M), pick(LN), f ? 'F' : 'M', `${y}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`, y > 2006 ? (y > 2011 ? 'Écolier(ère)' : 'Lycéen(ne)') : pick(JOBS), i < 100 ? 'fes' : i < 122 ? 'meknes' : 'rabat']);
    }
    return out;
  }
  function buildPatients() {
    return PEOPLE.concat(extraPeople()).map((p, i) => {
      const id = 'p' + (i + 1);
      const hist = i === 0 ? 'Diabète de type 2 (déclaré)' : pick(HIST);
      const allergies = i === 0 ? ['Pénicilline'] : pick(ALLERG).slice();
      const slug = (p[0].split(' ')[0] + '.' + p[1].replace(/\s|’/g, '')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const created = [7, 16, 17, 22, 25].includes(i) ? D.ymd(D.add(D.today(), -int(0, Math.max(0, D.today().getDate() - 1)))) : D.ymd(D.add(D.today(), -int(40, 900)));
      return {
        id, first: p[0], last: p[1], sex: p[2], dob: p[3], profession: p[4], clinic: p[5],
        phone: '06 ' + [int(10, 99), int(10, 99), int(10, 99), int(10, 99)].join(' '),
        email: slug + '@' + pick(['gmail.com', 'outlook.fr', 'yahoo.fr', 'menara.ma']),
        address: int(2, 140) + ', ' + pick(STREETS) + ', ' + CLINICS.find(c => c.id === p[5]).city,
        emergency: { name: pick(['Samira', 'Hassan', 'Latifa', 'Driss', 'Amina', 'Said']) + ' ' + p[1], relation: pick(['Conjoint(e)', 'Parent', 'Frère / sœur']), phone: '06 ' + [int(10, 99), int(10, 99), int(10, 99), int(10, 99)].join(' ') },
        cover: i === 0 ? 'CNOPS' : pick(COVER), coverNo: String(int(100000, 999999)) + String(int(1000, 9999)),
        fileNo: 'DOS-' + String(1040 + i * 7).padStart(5, '0'),
        history: hist.startsWith('Aucun') ? [] : [hist], allergies, meds: (MEDS[hist] || []).slice(),
        smoker: chance(.2), pregnant: false,
        dentist: p[5] === 'fes' ? (i >= 12 && [12, 13, 18, 19].includes(i) ? 'd3' : pick(['d1', 'd1', 'd2'])) : p[5] === 'meknes' ? 'd4' : 'd5',
        tags: [], created, avatar: AV[i % AV.length], notes: '', noShows: 0, lateCount: 0, reinforced: false,
        consent: { rgpd: true, sms: chance(.9), email: true, whatsapp: chance(.7), photos: chance(.6) }
      };
    });
  }

  const N_AGE = p => new Date().getFullYear() - +p.dob.slice(0, 4);
  /* ---------- Génération des rendez-vous ---------- */
  function buildAppointments(patients) {
    const appts = []; let n = 1;
    const today = D.today(); const todayY = D.ymd(today); const now = D.nowMin();
    const byClinic = c => patients.filter(p => p.clinic === c && p.id !== 'p1');
    const orthoIds = ['p13', 'p14', 'p19', 'p20'];
    const dentists = STAFF.filter(s => s.role === 'dentiste');
    const orthoPool = patients.filter(p => p.clinic === 'fes' && p.id !== 'p1' && (orthoIds.includes(p.id) || N_AGE(p) < 40));
    const typeFor = d => {
      if (d.id === 'd3') return pick(['orthodontie', 'orthodontie', 'orthodontie', 'consultation', 'controle']);
      if (d.id === 'd2') return pick(['implantologie', 'chirurgie', 'extraction', 'consultation', 'controle', 'prothese', 'urgence']);
      return pick(['consultation', 'consultation', 'controle', 'detartrage', 'detartrage', 'carie', 'carie', 'extraction', 'prothese', 'urgence']);
    };
    for (let off = -30; off <= 30; off++) {
      const day = D.add(today, off); const y = D.ymd(day);
      if (day.getDay() === 0 && off !== 0) continue;
      const sat = day.getDay() === 6;
      dentists.forEach(d => {
        let t = D.min('08:30'); const end = sat ? D.min('13:00') : D.min('18:30');
        const forced = off === 0 && d.id === 'd1' ? [['08:30', 'consultation', 'p2'], ['09:30', 'detartrage', 'p6']] : off === 0 && d.id === 'd2' ? [['08:30', 'controle', 'p3'], ['10:30', 'implantologie', 'p15']] : [];
        while (t < end) {
          if (t >= D.min('12:30') && t < D.min('14:00')) { t = D.min('14:00'); continue; }
          const f = forced.find(x => !x.done && D.min(x[0]) <= t);
          if (f) { f.done = true; t = D.min(f[0]); }
          if (!f && !chance(.68)) { t += 30; continue; }
          const type = f ? f[1] : typeFor(d); const dur = TYPES[type].dur;
          const nextF = forced.find(x => !x.done && D.min(x[0]) >= t);
          if (!f && nextF && t + dur > D.min(nextF[0])) { t = D.min(nextF[0]); continue; }
          if (t + dur > end + 15) break;
          const pool = d.id === 'd3' ? orthoPool : byClinic(d.clinic);
          const p = f ? patients.find(x => x.id === f[2]) : pick(pool);
          if (!p) { t += 30; continue; }
          let status;
          const s = t, e = t + dur;
          if (off < 0 || (off === 0 && e <= now)) { const r = R(); status = r < .84 ? 'termine' : r < .91 ? 'noshow' : 'annule'; }
          else if (off === 0 && s <= now && now < e) status = 'encours';
          else if (off === 0) status = chance(.72) ? 'confirme' : 'attente';
          else if (off <= 2) { const r = R(); status = r < .58 ? 'confirme' : r < .95 ? 'attente' : 'annule'; }
          else status = chance(.42) ? 'confirme' : 'attente';
          appts.push({ id: 'a' + (n++), patient: p.id, dentist: d.id, clinic: d.clinic, chair: d.chair, date: y, start: D.hm(t), dur, type, status, note: '', late: status === 'termine' && chance(.08) ? int(10, 25) : 0, moved: chance(.05), source: off > 0 && chance(.18) ? 'online' : 'cabinet', created: D.stamp() });
          t += Math.ceil(dur / 15) * 15 + (chance(.3) ? 15 : 0);
        }
      });
    }
    // Rendez-vous d'Ahmed Benali (patient vitrine)
    const A = (off, start, type, status, dentist = 'd1', note = '') => appts.push({ id: 'a' + (n++), patient: 'p1', dentist, clinic: 'fes', chair: dentist === 'd1' ? 'Fauteuil 1' : 'Fauteuil 2', date: D.ymd(D.add(today, off)), start, dur: TYPES[type].dur, type, status, note, late: 0, moved: false, source: 'cabinet', created: D.stamp() });
    A(-26, '11:00', 'carie', 'termine', 'd1', 'Composite 26 OD');
    A(-12, '16:00', 'carie', 'termine', 'd1', 'Traitement endodontique 36');
    A(0, '14:30', 'prothese', now > D.min('15:30') ? 'termine' : 'confirme', 'd1', 'Essayage & scellement couronne zircone 36');
    A(21, '10:00', 'consultation', 'attente', 'd1', 'Blanchiment — séance 1');
    // Remove overlaps for d1 today 14:30
    return appts.filter((a, i, arr) => !(a.patient !== 'p1' && a.dentist === 'd1' && a.date === todayY && D.min(a.start) < D.min('15:30') && D.min(a.start) + a.dur > D.min('14:30')));
  }

  /* ---------- Consultations ---------- */
  const CT = {
    consultation: ['Bilan bucco-dentaire', 'Examen clinique complet, sondage parodontal, bilan radiographique.', 'Gencive légèrement inflammatoire au niveau antérieur mandibulaire. Plaque modérée.', 'Gingivite localisée. Lésion carieuse suspectée à confirmer radiologiquement.', 'Détartrage, contrôle de la lésion, enseignement à l’hygiène.', 'Examen réalisé, radiographie panoramique.'],
    controle: ['Contrôle de routine', 'RAS depuis la dernière visite.', 'Bonne hygiène. Restaurations en place.', 'Situation stable.', 'Prochain contrôle dans 6 mois.', 'Examen de contrôle.'],
    detartrage: ['Tartre et saignements', 'Saignements au brossage.', 'Tartre sus-gingival important secteur 3 et 4.', 'Gingivite associée à la plaque.', 'Détartrage complet.', 'Détartrage + polissage, conseils d’hygiène.'],
    carie: ['Sensibilité au froid', 'Douleur provoquée au froid, brève.', 'Lésion carieuse occluso-distale.', 'Carie dentinaire.', 'Restauration composite.', 'Curetage + composite stratifié.'],
    extraction: ['Dent délabrée', 'Douleurs récurrentes.', 'Délabrement coronaire important, non conservable.', 'Dent non restaurable.', 'Extraction + consignes post-opératoires.', 'Extraction sous anesthésie locale, hémostase OK.'],
    implantologie: ['Remplacement dent absente', 'Édentement unitaire depuis 2 ans.', 'Volume osseux favorable sur CBCT.', 'Édentement unitaire.', 'Pose implant + cicatrisation 3 mois.', 'Pose implant, suture, ordonnance post-op.'],
    orthodontie: ['Suivi orthodontique', 'Pas de gêne particulière.', 'Alignement en progression, hygiène correcte.', 'Traitement orthodontique en cours.', 'Poursuite du traitement.', 'Activation / changement d’arc.'],
    prothese: ['Réhabilitation prothétique', 'Demande de restauration durable.', 'Dent dépulpée fragilisée.', 'Indication de couronne.', 'Couronne zircone.', 'Préparation, empreinte optique.'],
    chirurgie: ['Acte chirurgical', 'Adressé pour chirurgie.', 'Dent de sagesse incluse.', 'Inclusion dentaire.', 'Avulsion chirurgicale.', 'Chirurgie réalisée, suites simples.'],
    urgence: ['Douleur aiguë', 'Douleur spontanée depuis 48h.', 'Test au froid positif prolongé.', 'Pulpite probable — à confirmer.', 'Pulpotomie + antalgiques.', 'Soin d’urgence réalisé.']
  };
  function buildConsultations(appts) {
    const out = []; let n = 1;
    appts.filter(a => a.status === 'termine' && a.patient !== 'p1').forEach(a => {
      const c = CT[a.type];
      out.push({ id: 'c' + (n++), patient: a.patient, dentist: a.dentist, date: a.date, appt: a.id, motif: c[0], anamnese: c[1], history: '', allergies: '', observations: c[2], diagnosis: c[3], proposed: c[4], done: c[5], notes: '', type: a.type });
    });
    const p1 = (off, type, f) => out.push(Object.assign({ id: 'c' + (n++), patient: 'p1', dentist: 'd1', date: D.ymd(D.add(D.today(), off)), type, history: 'Diabète de type 2 (déclaré), sous Metformine.', allergies: 'Pénicilline (déclarée)' }, f));
    p1(-96, 'consultation', { motif: 'Première consultation — bilan complet', anamnese: 'Patient adressé par un confrère. Souhaite un bilan global et une remise en état. Dernière visite dentaire il y a 3 ans.', observations: 'Tartre généralisé. Lésion carieuse 26 (OD). 36 : ancienne obturation fracturée, sensibilité à la percussion.', diagnosis: 'Gingivite généralisée. Carie 26. Atteinte pulpaire 36 à confirmer.', proposed: 'Détartrage, composite 26, traitement endodontique 36 puis couronne zircone. Blanchiment sur demande du patient.', done: 'Examen clinique, panoramique, photos intra-orales.', notes: 'Patient motivé, anxieux au fraisage : prévoir séances courtes.' });
    p1(-61, 'detartrage', { motif: 'Détartrage', anamnese: 'RAS depuis la dernière visite.', observations: 'Tartre sus et sous-gingival secteurs 3/4.', diagnosis: 'Gingivite associée à la plaque.', proposed: 'Contrôle hygiène dans 3 mois.', done: 'Détartrage ultrasonique + polissage. Enseignement brossage (technique de Bass).', notes: '' });
    p1(-26, 'carie', { motif: 'Soin 26', anamnese: 'Sensibilité au froid persistante sur 26.', observations: 'Lésion OD 26 sans atteinte pulpaire.', diagnosis: 'Carie dentinaire 26.', proposed: '—', done: 'Composite stratifié 26 OD, teinte A2.', notes: '' });
    p1(-12, 'carie', { motif: 'Traitement endodontique 36', anamnese: 'Douleurs à la mastication.', observations: 'Test au froid négatif 36, percussion positive.', diagnosis: 'Nécrose pulpaire 36 (confirmée cliniquement et radiologiquement).', proposed: 'Couronne zircone 36 après obturation canalaire.', done: 'Traitement endodontique 3 canaux, obturation. Empreinte optique pour couronne envoyée au laboratoire.', notes: 'Pas d’antibiotique prescrit (allergie pénicilline déclarée).' });
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }

  /* ---------- Odontogrammes ---------- */
  function buildOdonto() {
    const t = D.ymd(D.today());
    return {
      p1: {
        teeth: {
          '18': { initial: [{ c: 'absente' }] }, '26': { initial: [{ c: 'carie', s: ['O', 'D'] }], done: [{ c: 'obturation', s: ['O', 'D'] }] },
          '36': { initial: [{ c: 'carie', s: ['O', 'M'] }], done: [{ c: 'endo' }], planned: [{ c: 'couronne' }] },
          '46': { initial: [{ c: 'obturation', s: ['O'] }] }, '38': { initial: [{ c: 'absente' }] }, '48': { initial: [{ c: 'extraction' }] },
          '11': { planned: [{ c: 'autre', note: 'Blanchiment' }] }, '21': { planned: [{ c: 'autre', note: 'Blanchiment' }] },
          '31': { initial: [{ c: 'gingival' }] }, '41': { initial: [{ c: 'gingival' }] }
        },
        history: [
          { date: D.addYmd(t, -96), user: 'Dr. Salma Bennani', tooth: '36', layer: 'initial', c: 'carie', action: 'ajout' },
          { date: D.addYmd(t, -96), user: 'Dr. Salma Bennani', tooth: '26', layer: 'initial', c: 'carie', action: 'ajout' },
          { date: D.addYmd(t, -96), user: 'Dr. Salma Bennani', tooth: '36', layer: 'planned', c: 'couronne', action: 'ajout' },
          { date: D.addYmd(t, -26), user: 'Dr. Salma Bennani', tooth: '26', layer: 'done', c: 'obturation', action: 'ajout' },
          { date: D.addYmd(t, -12), user: 'Dr. Salma Bennani', tooth: '36', layer: 'done', c: 'endo', action: 'ajout' }
        ].reverse()
      },
      p12: { teeth: { '11': { initial: [{ c: 'autre', note: 'Dyschromie' }], done: [{ c: 'prothese', note: 'Facette' }] }, '21': { initial: [{ c: 'autre', note: 'Dyschromie' }], done: [{ c: 'prothese', note: 'Facette' }] }, '12': { planned: [{ c: 'prothese', note: 'Facette' }] }, '22': { planned: [{ c: 'prothese', note: 'Facette' }] } }, history: [] },
      p15: { teeth: { '46': { initial: [{ c: 'absente' }], planned: [{ c: 'implant' }] }, '47': { initial: [{ c: 'couronne' }] }, '16': { initial: [{ c: 'endo' }, { c: 'couronne' }] } }, history: [] }
    };
  }

  /* ---------- Plans de traitement ---------- */
  function buildPlans() {
    const t = D.ymd(D.today());
    const it = (label, tooth, price, status, planned, done, paid) => ({ id: 'i' + Math.floor(R() * 1e9).toString(36), label, tooth, price, status, planned, done, paid });
    return [
      { id: 'tp1', patient: 'p1', dentist: 'd1', title: 'Réhabilitation & esthétique', created: D.addYmd(t, -96), status: 'encours', items: [
        it('Consultation', '—', 300, 'termine', D.addYmd(t, -96), D.addYmd(t, -96), 300),
        it('Détartrage & polissage', '—', 400, 'termine', D.addYmd(t, -61), D.addYmd(t, -61), 400),
        it('Traitement carie (composite)', '26', 600, 'termine', D.addYmd(t, -26), D.addYmd(t, -26), 600),
        it('Traitement endodontique', '36', 1200, 'termine', D.addYmd(t, -12), D.addYmd(t, -12), 1200),
        it('Couronne zircone', '36', 3500, 'encours', t, '', 2500),
        it('Blanchiment', '11–21', 2500, 'planifie', D.addYmd(t, 21), '', 0)] },
      { id: 'tp2', patient: 'p15', dentist: 'd2', title: 'Implant 46', created: D.addYmd(t, -40), status: 'planifie', items: [
        it('Consultation', '—', 300, 'termine', D.addYmd(t, -40), D.addYmd(t, -40), 300),
        it('Radiographie panoramique', '—', 250, 'termine', D.addYmd(t, -40), D.addYmd(t, -40), 250),
        it('Implant (pose)', '46', 8000, 'planifie', t, '', 4000),
        it('Couronne zircone', '46', 3500, 'accepte', D.addYmd(t, 100), '', 0)] },
      { id: 'tp3', patient: 'p12', dentist: 'd1', title: 'Facettes esthétiques', created: D.addYmd(t, -70), status: 'encours', items: [
        it('Consultation esthétique', '—', 300, 'termine', D.addYmd(t, -70), D.addYmd(t, -70), 300),
        it('Facette céramique', '11', 3800, 'termine', D.addYmd(t, -30), D.addYmd(t, -30), 3800),
        it('Facette céramique', '21', 3800, 'termine', D.addYmd(t, -30), D.addYmd(t, -30), 3800),
        it('Facette céramique', '12', 3800, 'planifie', D.addYmd(t, 9), '', 0),
        it('Facette céramique', '22', 3800, 'planifie', D.addYmd(t, 9), '', 0)] },
      { id: 'tp4', patient: 'p11', dentist: 'd1', title: 'Prothèse amovible', created: D.addYmd(t, -8), status: 'propose', items: [
        it('Extraction simple', '45', 500, 'propose', '', '', 0),
        it('Prothèse amovible partielle', 'Mand.', 4500, 'propose', '', '', 0)] },
      { id: 'tp5', patient: 'p4', dentist: 'd1', title: 'Bridge 24-26', created: D.addYmd(t, -20), status: 'accepte', items: [
        it('Traitement endodontique', '24', 1200, 'accepte', D.addYmd(t, 5), '', 0),
        it('Bridge 3 éléments', '24–26', 9000, 'accepte', D.addYmd(t, 30), '', 3000)] },
      { id: 'tp6', patient: 'p7', dentist: 'd2', title: 'Extraction dents de sagesse', created: D.addYmd(t, -150), status: 'termine', items: [
        it('Extraction chirurgicale', '38', 1500, 'termine', D.addYmd(t, -140), D.addYmd(t, -140), 1500),
        it('Extraction chirurgicale', '48', 1500, 'termine', D.addYmd(t, -140), D.addYmd(t, -140), 1500),
        it('Contrôle', '—', 200, 'termine', D.addYmd(t, -130), D.addYmd(t, -130), 200)] },
      { id: 'tp7', patient: 'p9', dentist: 'd1', title: 'Parodontie', created: D.addYmd(t, -15), status: 'encours', items: [
        it('Surfaçage radiculaire (quadrant)', 'Q1', 700, 'termine', D.addYmd(t, -10), D.addYmd(t, -10), 700),
        it('Surfaçage radiculaire (quadrant)', 'Q2', 700, 'termine', D.addYmd(t, -10), D.addYmd(t, -10), 700),
        it('Surfaçage radiculaire (quadrant)', 'Q3', 700, 'planifie', D.addYmd(t, 4), '', 0),
        it('Surfaçage radiculaire (quadrant)', 'Q4', 700, 'planifie', D.addYmd(t, 4), '', 0)] },
      { id: 'tp8', patient: 'p24', dentist: 'd5', title: 'Soins conservateurs', created: D.addYmd(t, -5), status: 'propose', items: [
        it('Traitement carie (composite)', '15', 600, 'propose', '', '', 0),
        it('Traitement carie (composite)', '25', 600, 'propose', '', '', 0),
        it('Détartrage & polissage', '—', 400, 'propose', '', '', 0)] }
    ];
  }

  /* ---------- Finance ---------- */
  function buildFinance(appts) {
    const invoices = [], payments = []; let fi = 1, pi = 1;
    const t = D.ymd(D.today());
    const methods = ['especes', 'carte', 'carte', 'virement', 'especes', 'en_ligne'];
    appts.filter(a => a.status === 'termine' && a.patient !== 'p1').forEach(a => {
      const price = TYPES[a.type].price;
      const inv = { id: 'f' + fi, number: 'FAC-2026-' + String(fi + 1200).padStart(5, '0'), patient: a.patient, clinic: a.clinic, dentist: a.dentist, date: a.date, due: D.addYmd(a.date, 30), items: [{ label: TYPES[a.type].label, tooth: '', qty: 1, price }], discount: 0, total: price, appt: a.id };
      fi++;
      const r = R(); let paid = price;
      if (a.type === 'implantologie' || a.type === 'prothese') paid = r < .55 ? price : r < .85 ? Math.round(price * .5 / 100) * 100 : 0;
      else if (r > .9) paid = 0; else if (r > .86) paid = Math.round(price / 2 / 50) * 50;
      if (paid > 0) payments.push({ id: 'pay' + (pi++), invoice: inv.id, patient: a.patient, clinic: a.clinic, date: a.date, amount: paid, method: pick(methods), kind: paid < price ? 'acompte' : 'paiement', ref: '' });
      invoices.push(inv);
    });
    // Ahmed Benali — total 8 500 / payé 5 000 / reste 3 500
    const mk = (off, items, pays) => { const id = 'f' + fi; const total = items.reduce((s, x) => s + x.price * x.qty, 0); invoices.push({ id, number: 'FAC-2026-' + String(fi + 1200).padStart(5, '0'), patient: 'p1', clinic: 'fes', dentist: 'd1', date: D.addYmd(t, off), due: D.addYmd(t, off + 30), items, discount: 0, total, plan: 'tp1' }); fi++; pays.forEach(p => payments.push({ id: 'pay' + (pi++), invoice: id, patient: 'p1', clinic: 'fes', date: D.addYmd(t, p[0]), amount: p[1], method: p[2], kind: p[3] || 'paiement', ref: '' })); };
    mk(-96, [{ label: 'Consultation', tooth: '', qty: 1, price: 300 }], [[-96, 300, 'especes']]);
    mk(-61, [{ label: 'Détartrage & polissage', tooth: '', qty: 1, price: 400 }], [[-61, 400, 'carte']]);
    mk(-26, [{ label: 'Traitement carie (composite)', tooth: '26', qty: 1, price: 600 }], [[-26, 600, 'carte']]);
    mk(-12, [{ label: 'Traitement endodontique', tooth: '36', qty: 1, price: 1200 }], [[-12, 1200, 'virement']]);
    mk(-12, [{ label: 'Couronne zircone', tooth: '36', qty: 1, price: 3500 }], [[-12, 1500, 'carte', 'acompte'], [-2, 1000, 'en_ligne', 'acompte']]);
    mk(-5, [{ label: 'Blanchiment', tooth: '11–21', qty: 1, price: 2500 }], []);
    // Plans : acomptes hors séances
    [['p15', -40, 'Implant (pose) — acompte', 8000, [[-39, 4000, 'virement', 'acompte']]], ['p12', -30, 'Facettes céramiques 11, 21', 7600, [[-30, 7600, 'carte']]], ['p4', -18, 'Bridge 24–26 — acompte', 9000, [[-18, 3000, 'especes', 'acompte']]]].forEach(([p, off, label, price, pays]) => {
      const id = 'f' + fi; invoices.push({ id, number: 'FAC-2026-' + String(fi + 1200).padStart(5, '0'), patient: p, clinic: 'fes', dentist: 'd1', date: D.addYmd(t, off), due: D.addYmd(t, off + 30), items: [{ label, tooth: '', qty: 1, price }], discount: 0, total: price }); fi++;
      pays.forEach(x => payments.push({ id: 'pay' + (pi++), invoice: id, patient: p, clinic: 'fes', date: D.addYmd(t, x[0]), amount: x[1], method: x[2], kind: x[3] || 'paiement', ref: '' }));
    });
    // Un remboursement
    payments.push({ id: 'pay' + (pi++), invoice: invoices[5].id, patient: invoices[5].patient, clinic: invoices[5].clinic, date: D.addYmd(t, -3), amount: -150, method: 'especes', kind: 'remboursement', ref: 'Acte non réalisé' });
    return { invoices, payments, nextInvoice: fi };
  }

  function buildQuotes() {
    const t = D.ymd(D.today());
    return [
      { id: 'q1', number: 'DEV-2026-0141', patient: 'p1', dentist: 'd1', date: D.addYmd(t, -95), valid: D.addYmd(t, -35), status: 'accepte', acceptedAt: D.addYmd(t, -90), signature: 'Ahmed Benali', items: [{ label: 'Traitement endodontique', tooth: '36', qty: 1, price: 1200, disc: 0 }, { label: 'Couronne zircone', tooth: '36', qty: 1, price: 3500, disc: 0 }, { label: 'Blanchiment', tooth: '11–21', qty: 1, price: 2800, disc: 300 }], discount: 0, conditions: 'Devis valable 60 jours. Acompte de 30 % à l’acceptation. Solde à la pose.' },
      { id: 'q2', number: 'DEV-2026-0152', patient: 'p15', dentist: 'd2', date: D.addYmd(t, -41), valid: D.addYmd(t, 19), status: 'accepte', acceptedAt: D.addYmd(t, -40), signature: 'Karim Mernissi', items: [{ label: 'Implant (pose)', tooth: '46', qty: 1, price: 8000, disc: 0 }, { label: 'Couronne zircone', tooth: '46', qty: 1, price: 3500, disc: 0 }], discount: 0, conditions: 'Devis valable 60 jours. Paiement en 3 fois possible.' },
      { id: 'q3', number: 'DEV-2026-0163', patient: 'p11', dentist: 'd1', date: D.addYmd(t, -8), valid: D.addYmd(t, 52), status: 'envoye', items: [{ label: 'Extraction simple', tooth: '45', qty: 1, price: 500, disc: 0 }, { label: 'Prothèse amovible partielle', tooth: 'Mand.', qty: 1, price: 4500, disc: 0 }], discount: 5, conditions: 'Devis valable 60 jours.' },
      { id: 'q4', number: 'DEV-2026-0164', patient: 'p4', dentist: 'd1', date: D.addYmd(t, -21), valid: D.addYmd(t, 39), status: 'accepte', acceptedAt: D.addYmd(t, -20), signature: 'Khadija Berrada', items: [{ label: 'Traitement endodontique', tooth: '24', qty: 1, price: 1200, disc: 0 }, { label: 'Bridge 3 éléments', tooth: '24–26', qty: 1, price: 9000, disc: 0 }], discount: 0, conditions: 'Devis valable 60 jours. Acompte de 30 %.' },
      { id: 'q5', number: 'DEV-2026-0170', patient: 'p24', dentist: 'd5', date: D.addYmd(t, -5), valid: D.addYmd(t, 55), status: 'brouillon', items: [{ label: 'Traitement carie (composite)', tooth: '15', qty: 1, price: 600, disc: 0 }, { label: 'Traitement carie (composite)', tooth: '25', qty: 1, price: 600, disc: 0 }, { label: 'Détartrage & polissage', tooth: '', qty: 1, price: 400, disc: 0 }], discount: 0, conditions: 'Devis valable 60 jours.' },
      { id: 'q6', number: 'DEV-2026-0128', patient: 'p5', dentist: 'd2', date: D.addYmd(t, -120), valid: D.addYmd(t, -60), status: 'refuse', items: [{ label: 'Implant (pose)', tooth: '36', qty: 1, price: 8000, disc: 0 }], discount: 0, conditions: 'Devis valable 60 jours.' }
    ];
  }

  /* ---------- Opérations ---------- */
  const SUPPLIERS = [
    { id: 'sup1', name: 'Dentalis Maroc', contact: 'Youssef Lamrani', phone: '05 22 40 11 22', email: 'commandes@dentalis.ma', city: 'Casablanca', cats: ['Matériaux dentaires', 'Anesthésiques', 'Résines'], delay: 3, rating: 4.8 },
    { id: 'sup2', name: 'MedSupply Fès', contact: 'Salima Ouadghiri', phone: '05 35 65 44 12', email: 'contact@medsupply-fes.ma', city: 'Fès', cats: ['Consommables', 'Gants', 'Masques', 'Compresses'], delay: 1, rating: 4.6 },
    { id: 'sup3', name: 'Hygiène Pro Santé', contact: 'Karim Bensouda', phone: '05 37 70 88 90', email: 'ventes@hygienepro.ma', city: 'Rabat', cats: ['Produits de désinfection'], delay: 2, rating: 4.4 },
    { id: 'sup4', name: 'Instrumenta Dental', contact: 'Nabil Chami', phone: '05 22 99 31 31', email: 'pro@instrumenta.ma', city: 'Casablanca', cats: ['Instruments'], delay: 5, rating: 4.7 }
  ];
  function buildStock() {
    const t = D.today();
    const exp = d => D.ymd(D.add(t, d));
    const P = (name, cat, qty, min, unit, sup, price, lot, e) => ({ name, cat, qty, min, unit, sup, price, lot, exp: e });
    const base = [
      P('Gants nitrile taille M', 'Gants', 6, 10, 'boîte ×100', 'sup2', 85, 'GN-2604', exp(420)),
      P('Gants nitrile taille S', 'Gants', 14, 8, 'boîte ×100', 'sup2', 85, 'GN-2605', exp(430)),
      P('Masques chirurgicaux type IIR', 'Masques', 22, 10, 'boîte ×50', 'sup2', 60, 'MK-8812', exp(610)),
      P('Masques FFP2', 'Masques', 4, 5, 'boîte ×20', 'sup2', 140, 'FF-2201', exp(500)),
      P('Compresses stériles 10×10', 'Compresses', 38, 15, 'paquet ×50', 'sup2', 32, 'CP-5512', exp(700)),
      P('Articaïne 4 % adrénalinée 1/100 000', 'Anesthésiques', 9, 12, 'boîte ×50 carpules', 'sup1', 390, 'AR-24B7', exp(46)),
      P('Lidocaïne 2 % adrénalinée', 'Anesthésiques', 16, 6, 'boîte ×50 carpules', 'sup1', 320, 'LI-9921', exp(280)),
      P('Composite nano-hybride A2', 'Résines', 11, 6, 'seringue 4 g', 'sup1', 260, 'CN-A2-771', exp(190)),
      P('Composite nano-hybride A3', 'Résines', 3, 6, 'seringue 4 g', 'sup1', 260, 'CN-A3-772', exp(25)),
      P('Adhésif universel', 'Résines', 5, 3, 'flacon 5 ml', 'sup1', 540, 'AU-3310', exp(160)),
      P('Ciment verre ionomère', 'Matériaux dentaires', 7, 4, 'kit', 'sup1', 410, 'CVI-102', exp(330)),
      P('Alginate de prise normale', 'Matériaux dentaires', 2, 4, 'sachet 450 g', 'sup1', 120, 'ALG-55', exp(210)),
      P('Silicone d’empreinte (light)', 'Matériaux dentaires', 9, 4, 'cartouche ×2', 'sup1', 280, 'SIL-L-19', exp(51)),
      P('Gutta-percha 04', 'Matériaux dentaires', 12, 5, 'boîte ×60', 'sup1', 150, 'GP-04-8', exp(900)),
      P('Limes endodontiques rotatives', 'Instruments', 18, 10, 'blister ×6', 'sup4', 420, 'LR-25-06', exp(1200)),
      P('Fraises diamantées assorties', 'Instruments', 25, 10, 'lot ×10', 'sup4', 190, 'FD-771', exp(1500)),
      P('Miroirs buccaux', 'Instruments', 40, 20, 'unité', 'sup4', 22, 'MB-004', exp(3000)),
      P('Solution de désinfection surfaces', 'Produits de désinfection', 6, 4, 'bidon 5 L', 'sup3', 210, 'DS-5L-33', exp(365)),
      P('Lingettes désinfectantes', 'Produits de désinfection', 3, 8, 'boîte ×120', 'sup3', 75, 'LD-120-9', exp(240)),
      P('Détergent instruments (bain)', 'Produits de désinfection', 5, 3, 'flacon 1 L', 'sup3', 180, 'DB-1L-2', exp(58)),
      P('Sachets de stérilisation', 'Consommables', 12, 6, 'boîte ×200', 'sup2', 95, 'SS-200', exp(800)),
      P('Pompes à salive', 'Consommables', 9, 6, 'sachet ×100', 'sup2', 40, 'PS-100', exp(900)),
      P('Rouleaux de coton', 'Consommables', 30, 10, 'sachet ×300', 'sup2', 28, 'RC-300', exp(1000)),
      P('Gobelets jetables', 'Consommables', 2, 5, 'carton ×1000', 'sup2', 110, 'GJ-1000', exp(2000))
    ];
    const out = []; let n = 1;
    base.forEach(p => out.push(Object.assign({ id: 'st' + (n++), clinic: 'fes' }, p)));
    base.slice(0, 12).forEach(p => out.push(Object.assign({ id: 'st' + (n++), clinic: 'meknes' }, p, { qty: Math.max(1, Math.round(p.qty * (0.4 + R()))) })));
    base.slice(4, 16).forEach(p => out.push(Object.assign({ id: 'st' + (n++), clinic: 'rabat' }, p, { qty: Math.max(1, Math.round(p.qty * (0.5 + R()))) })));
    return out;
  }
  function buildOrders() {
    const t = D.ymd(D.today());
    return [
      { id: 'po1', number: 'CMD-0231', supplier: 'sup1', clinic: 'fes', date: D.addYmd(t, -2), status: 'commandee', lines: [{ product: 'st6', qty: 10, price: 390 }, { product: 'st9', qty: 6, price: 260 }], expected: D.addYmd(t, 1) },
      { id: 'po2', number: 'CMD-0232', supplier: 'sup2', clinic: 'fes', date: D.addYmd(t, -1), status: 'brouillon', lines: [{ product: 'st1', qty: 10, price: 85 }, { product: 'st4', qty: 5, price: 140 }, { product: 'st24', qty: 4, price: 110 }] },
      { id: 'po3', number: 'CMD-0225', supplier: 'sup3', clinic: 'fes', date: D.addYmd(t, -16), status: 'recue', received: D.addYmd(t, -13), lines: [{ product: 'st18', qty: 4, price: 210 }, { product: 'st19', qty: 6, price: 75 }] },
      { id: 'po4', number: 'CMD-0219', supplier: 'sup4', clinic: 'fes', date: D.addYmd(t, -34), status: 'recue', received: D.addYmd(t, -29), lines: [{ product: 'st15', qty: 12, price: 420 }] },
      { id: 'po5', number: 'CMD-0210', supplier: 'sup1', clinic: 'fes', date: D.addYmd(t, -58), status: 'recue', received: D.addYmd(t, -55), lines: [{ product: 'st8', qty: 8, price: 260 }, { product: 'st10', qty: 3, price: 540 }, { product: 'st11', qty: 4, price: 410 }] }
    ];
  }
  const LABS = [
    { id: 'lab1', name: 'Atlas Prothèse Dentaire', city: 'Fès', contact: 'Hassan Tber', phone: '05 35 94 12 12', email: 'atelier@atlas-prothese.ma', delay: 7, specialties: ['Zircone', 'Céramo-métal', 'Facettes'] },
    { id: 'lab2', name: 'DentoLab Meknès', city: 'Meknès', contact: 'Amal Rhazi', phone: '05 35 51 77 00', email: 'contact@dentolab.ma', delay: 10, specialties: ['Prothèse amovible', 'Gouttières'] },
    { id: 'lab3', name: 'OrthoForm Maroc', city: 'Casablanca', contact: 'Reda Kadiri', phone: '05 22 36 45 45', email: 'ortho@orthoform.ma', delay: 12, specialties: ['Appareils orthodontiques', 'Aligneurs', 'Contentions'] }
  ];
  function buildLab() {
    const t = D.ymd(D.today());
    const C = (id, patient, lab, type, teeth, shade, sent, due, status, price, notes = '', received = '') => ({ id, patient, lab, type, teeth, shade, sent, due, status, price, notes, received, dentist: patient === 'p15' ? 'd2' : patient === 'p13' || patient === 'p19' || patient === 'p14' ? 'd3' : 'd1', clinic: 'fes' });
    return [
      C('lb1', 'p1', 'lab1', 'Couronne zircone', '36', 'A2', D.addYmd(t, -11), D.addYmd(t, -1), 'recu', 1400, 'Empreinte optique. Contact proximal serré souhaité.', D.addYmd(t, -1)),
      C('lb2', 'p12', 'lab1', 'Facettes céramiques', '12, 22', 'BL3', D.addYmd(t, -6), D.addYmd(t, 3), 'fabrication', 2600, 'Harmoniser avec 11, 21 déjà posées.'),
      C('lb3', 'p4', 'lab1', 'Bridge 3 éléments', '24–26', 'A3', '', D.addYmd(t, 20), 'a_envoyer', 3200, 'Attente empreinte définitive.'),
      C('lb4', 'p11', 'lab2', 'Prothèse amovible partielle', 'Mandibule', 'A3', D.addYmd(t, -9), D.addYmd(t, 1), 'pret', 1800, 'Châssis métallique.'),
      C('lb5', 'p13', 'lab3', 'Appareil orthodontique', 'Maxillaire', '—', D.addYmd(t, -4), D.addYmd(t, 8), 'envoye', 1500, 'Disjoncteur.'),
      C('lb6', 'p14', 'lab3', 'Aligneurs (série 6–10)', 'Arcades complètes', '—', D.addYmd(t, -14), D.addYmd(t, -2), 'fabrication', 2200, 'Retard signalé par le laboratoire.'),
      C('lb7', 'p7', 'lab1', 'Couronne céramo-métallique', '16', 'A3.5', D.addYmd(t, -24), D.addYmd(t, -15), 'livre', 1100, '', D.addYmd(t, -15)),
      C('lb8', 'p19', 'lab3', 'Gouttière de contention', 'Maxillaire', '—', D.addYmd(t, -3), D.addYmd(t, 6), 'envoye', 600, ''),
      C('lb9', 'p9', 'lab2', 'Gouttière occlusale', 'Maxillaire', '—', '', D.addYmd(t, 12), 'a_envoyer', 700, 'Bruxisme déclaré.')
    ];
  }

  /* ---------- Communication, suivis, avis ---------- */
  function buildMessages() {
    const t = D.today(); const ts = (off, h) => { const d = D.add(t, off); d.setHours(...h.split(':').map(Number)); return d.toISOString(); };
    const M = (patient, dir, channel, text, at, auto = false, status = 'lu') => ({ id: 'm' + Math.floor(R() * 1e9).toString(36), patient, dir, channel, text, at, auto, status });
    return [
      M('p1', 'out', 'sms', 'Bonjour Ahmed, votre rendez-vous chez Dr. Salma Bennani est confirmé le ' + D.ymd(t).split('-').reverse().join('/') + ' à 14h30. Centre Dentaire Atlas — Fès.', ts(-3, '10:02'), true),
      M('p1', 'in', 'chat', 'Bonjour docteur, est-ce que je peux manger normalement avant la pose de la couronne ?', ts(-1, '19:40')),
      M('p1', 'out', 'chat', 'Bonjour M. Benali, oui sans problème. Pensez simplement à bien vous brosser les dents avant de venir. À demain !', ts(-1, '20:05')),
      M('p1', 'out', 'whatsapp', 'Rappel : votre rendez-vous est prévu demain à 14h30 avec Dr. Bennani. Répondez OUI pour confirmer.', ts(-1, '14:30'), true),
      M('p1', 'in', 'whatsapp', 'OUI', ts(-1, '14:41')),
      M('p12', 'out', 'email', 'Madame Benjelloun, vous trouverez ci-joint les instructions après la pose de vos facettes. N’hésitez pas à nous contacter.', ts(-30, '17:10')),
      M('p12', 'in', 'chat', 'Merci beaucoup, le résultat est magnifique !', ts(-29, '09:12')),
      M('p15', 'out', 'email', 'Instructions avant intervention : merci de prendre un petit-déjeuner léger et de venir accompagné. Durée estimée : 1h30.', ts(-1, '11:00'), true),
      M('p15', 'in', 'sms', 'Bien reçu, merci.', ts(-1, '11:47')),
      M('p5', 'out', 'sms', 'Bonjour Omar, nous avons remarqué que vous n’avez pas pu venir à votre rendez-vous. Souhaitez-vous le reprogrammer ?', ts(-4, '18:00'), true),
      M('p11', 'out', 'email', 'Votre devis DEV-2026-0163 est disponible dans votre espace patient.', ts(-8, '16:20'), true),
      M('p11', 'in', 'chat', 'Bonjour, est-ce que le paiement en plusieurs fois est possible pour la prothèse ?', ts(0, '08:14'), false, 'non_lu'),
      M('p8', 'in', 'chat', 'Bonjour, j’ai une douleur depuis hier soir côté gauche, est-ce possible de passer aujourd’hui ?', ts(0, '07:52'), false, 'non_lu'),
      M('p14', 'out', 'notif', 'Pensez à changer d’aligneur ce soir (série 6). Bonne continuation Yasmine !', ts(-2, '19:00'), true),
      M('p3', 'out', 'sms', 'Rappel de paiement : un solde de 250 DH reste à régler sur la facture FAC-2026-01254. Merci.', ts(-6, '10:00'), true)
    ];
  }
  const TEMPLATES = [
    { id: 't1', cat: 'Rappel', name: 'Rappel de rendez-vous', text: 'Bonjour {prenom}, votre rendez-vous chez {dentiste} est prévu {quand} à {heure}. {cabinet}. Répondez OUI pour confirmer.' },
    { id: 't2', cat: 'Confirmation', name: 'Confirmation de rendez-vous', text: 'Bonjour {prenom}, votre rendez-vous du {date} à {heure} avec {dentiste} est confirmé. À bientôt au {cabinet}.' },
    { id: 't3', cat: 'Avant intervention', name: 'Instructions avant intervention', text: 'Bonjour {prenom}, avant votre intervention : prenez un repas léger, brossez-vous les dents, apportez vos ordonnances en cours et venez accompagné(e) si possible.' },
    { id: 't4', cat: 'Après intervention', name: 'Instructions après extraction', text: 'Bonjour {prenom}, après votre extraction : ne pas rincer pendant 24h, éviter les boissons chaudes, alimentation froide et molle. En cas de saignement persistant, contactez-nous au {telephone}.' },
    { id: 't5', cat: 'Paiement', name: 'Rappel de paiement', text: 'Bonjour {prenom}, un solde de {montant} reste à régler au {cabinet}. Vous pouvez payer en ligne depuis votre espace patient. Merci.' },
    { id: 't6', cat: 'Documents', name: 'Document disponible', text: 'Bonjour {prenom}, un nouveau document est disponible dans votre espace patient Nacre.' },
    { id: 't7', cat: 'Suivi', name: 'Rappel de contrôle', text: 'Bonjour {prenom}, votre dernier contrôle date de 6 mois. Prenez rendez-vous en ligne en quelques clics : {lien}' },
    { id: 't8', cat: 'Satisfaction', name: 'Demande d’avis', text: 'Bonjour {prenom}, comment s’est passée votre expérience au {cabinet} ? Donnez votre avis en 30 secondes : {lien}' }
  ];
  const RULES = [
    { id: 'r1', name: 'Confirmation de rendez-vous', when: 'À la prise de rendez-vous', channels: { sms: true, email: true, whatsapp: false, push: true }, on: true, template: 't2', sent: 412 },
    { id: 'r2', name: 'Rappel 24h avant', when: '24 heures avant', channels: { sms: true, email: false, whatsapp: true, push: true }, on: true, template: 't1', sent: 1284 },
    { id: 'r3', name: 'Rappel quelques heures avant', when: '3 heures avant', channels: { sms: true, email: false, whatsapp: false, push: true }, on: true, template: 't1', sent: 1190 },
    { id: 'r4', name: 'Message après rendez-vous', when: '2 heures après', channels: { sms: false, email: true, whatsapp: false, push: true }, on: true, template: 't8', sent: 861 },
    { id: 'r5', name: 'Rappel de contrôle', when: '6 mois après le dernier contrôle', channels: { sms: true, email: true, whatsapp: false, push: false }, on: true, template: 't7', sent: 233 },
    { id: 'r6', name: 'Rappel de traitement', when: 'Étape suivante du plan non planifiée (J+14)', channels: { sms: false, email: true, whatsapp: false, push: true }, on: false, template: 't7', sent: 57 },
    { id: 'r7', name: 'Rappel renforcé (patients à risque no-show)', when: '48h + 24h + 3h avant, confirmation requise', channels: { sms: true, email: true, whatsapp: true, push: true }, on: true, template: 't1', sent: 64 }
  ];
  function buildFollowups() {
    const t = D.ymd(D.today());
    const F = (patient, type, due, note, status = 'a_faire', auto = true) => ({ id: 'fu' + Math.floor(R() * 1e9).toString(36), patient, type, due, note, status, auto });
    return [
      F('p2', 'Contrôle 6 mois', D.addYmd(t, -3), 'Dernier contrôle il y a 6 mois'),
      F('p6', 'Détartrage recommandé', D.addYmd(t, 2), 'Dernier détartrage il y a 11 mois'),
      F('p13', 'Contrôle orthodontique', D.addYmd(t, 5), 'Activation mensuelle'),
      F('p14', 'Contrôle orthodontique', D.addYmd(t, 1), 'Remise série aligneurs 6–10'),
      F('p7', 'Suivi après traitement', D.addYmd(t, -1), 'Contrôle cicatrisation 38/48'),
      F('p15', 'Suivi après traitement', D.addYmd(t, 7), 'Contrôle J+7 après pose d’implant'),
      F('p11', 'Relance devis', D.addYmd(t, 0), 'Devis prothèse envoyé il y a 8 jours'),
      F('p10', 'Contrôle 6 mois', D.addYmd(t, 12), 'Rappel automatique'),
      F('p16', 'Détartrage recommandé', D.addYmd(t, 20), 'Rappel automatique'),
      F('p3', 'Relance paiement', D.addYmd(t, -6), 'Solde 250 DH', 'a_faire', false),
      F('p9', 'Suivi après traitement', D.addYmd(t, 4), 'Réévaluation parodontale'),
      F('p18', 'Contrôle 6 mois', D.addYmd(t, -12), 'Rappel envoyé, sans réponse', 'relance'),
      F('p1', 'Suivi après traitement', D.addYmd(t, 14), 'Contrôle couronne 36')
    ];
  }
  function buildReviews(patients) {
    const t = D.today(); const out = [];
    const comments = [
      [5, 'Équipe très professionnelle, cabinet impeccable. Je recommande vivement.'], [5, 'Dr. Bennani prend le temps d’expliquer chaque étape, très rassurant.'],
      [5, 'Aucune attente, rappel par WhatsApp très pratique.'], [4, 'Très bon soin, un peu d’attente en salle.'], [5, 'Résultat esthétique magnifique, merci à toute l’équipe !'],
      [5, 'Prise de rendez-vous en ligne ultra simple.'], [4, 'Bonne prise en charge, tarifs clairs grâce au devis détaillé.'], [3, 'Soin correct mais retard de 20 minutes.'],
      [5, 'Mon fils était stressé, l’équipe a été adorable.'], [5, 'Implant posé sans douleur, suivi parfait.'], [4, 'Bon accueil, parking difficile.'], [5, '']
    ];
    for (let i = 0; i < 64; i++) {
      const c = pick(comments); const p = pick(patients);
      out.push({ id: 'rv' + i, patient: p.id, dentist: p.dentist, clinic: p.clinic, date: D.ymd(D.add(t, -int(0, 180))), rating: chance(.12) ? int(3, 4) : c[0], comment: c[1] });
    }
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }
  function buildOrtho() {
    const t = D.today(); const m = n => D.ymd(D.add(t, n * 30));
    const steps = (start, total, cur, notes) => Array.from({ length: total + 1 }, (_, i) => ({ month: i, date: D.ymd(D.add(D.parse(start), i * 30)), done: i <= cur, note: notes[i] || (i <= cur ? (i === 0 ? 'Pose de l’appareil' : 'Contrôle et activation') : ''), photo: i <= cur && i % 3 === 0 }));
    return [
      { id: 'or1', patient: 'p13', dentist: 'd3', appliance: 'Bagues métalliques + disjoncteur', start: m(-7), months: 18, current: 7, fee: 18000, paid: 10500, stage: 'Alignement / nivellement', steps: steps(m(-7), 18, 7, { 0: 'Pose bagues maxillaires et mandibulaires', 3: 'Changement d’arc 016 NiTi', 6: 'Arc 018 acier, élastiques classe II' }) },
      { id: 'or2', patient: 'p14', dentist: 'd3', appliance: 'Aligneurs transparents', start: m(-5), months: 12, current: 5, fee: 24000, paid: 16000, stage: 'Séries 6–10', steps: steps(m(-5), 12, 5, { 0: 'Remise série 1, taquets', 5: 'Remise séries 6–10' }) },
      { id: 'or3', patient: 'p19', dentist: 'd3', appliance: 'Bagues céramiques', start: m(-14), months: 20, current: 14, fee: 20000, paid: 17000, stage: 'Finitions', steps: steps(m(-14), 20, 14, { 0: 'Pose bagues céramiques', 12: 'Fermeture des espaces terminée' }) },
      { id: 'or4', patient: 'p20', dentist: 'd3', appliance: 'Appareil amovible (plaque)', start: m(-3), months: 10, current: 3, fee: 7000, paid: 3500, stage: 'Expansion', steps: steps(m(-3), 10, 3, { 0: 'Remise de la plaque', 2: 'Vérin activé ¼ tour/semaine' }) }
    ];
  }
  function buildDocs() {
    const t = D.ymd(D.today());
    const I = (patient, kind, title, off, cat, extra = {}) => Object.assign({ id: 'doc' + Math.floor(R() * 1e9).toString(36), patient, kind, title, date: D.addYmd(t, off), cat, seed: int(1, 9999), shared: false }, extra);
    const out = [
      I('p1', 'pano', 'Radiographie panoramique', -96, 'radio', { consult: 'Première consultation' }),
      I('p1', 'retro', 'Rétro-alvéolaire 36 (pré-op)', -12, 'radio', { consult: 'Traitement endodontique 36' }),
      I('p1', 'retro', 'Rétro-alvéolaire 36 (post-op)', -12, 'radio', { consult: 'Traitement endodontique 36' }),
      I('p1', 'bitewing', 'Bitewing gauche', -96, 'radio', { consult: 'Première consultation' }),
      I('p1', 'intra', 'Photo intra-orale — face', -96, 'photo', { consult: 'Première consultation' }),
      I('p1', 'pdf', 'Compte rendu — traitement endodontique', -12, 'pdf', { shared: true }),
      I('p1', 'pdf', 'Fiche laboratoire — couronne 36', -11, 'labo'),
      I('p1', 'scan', 'Empreinte optique 3D — arcade inf.', -12, 'scanner'),
      I('p12', 'pano', 'Radiographie panoramique', -70, 'radio'),
      I('p12', 'intra', 'Photo sourire — avant', -70, 'photo'),
      I('p15', 'cbct', 'CBCT secteur 4', -40, 'scanner'),
      I('p15', 'pano', 'Radiographie panoramique', -40, 'radio'),
      I('p13', 'ceph', 'Téléradiographie de profil', -210, 'radio'),
      I('p14', 'intra', 'Photos intra-orales — bilan', -150, 'photo'),
      I('p7', 'retro', 'Rétro-alvéolaire 48', -141, 'radio'),
      I('p4', 'pano', 'Radiographie panoramique', -22, 'radio'),
      I('p9', 'bitewing', 'Bilan bitewing', -16, 'radio'),
      I('p24', 'pano', 'Radiographie panoramique', -5, 'radio')
    ];
    return out;
  }
  const BA = [
    { id: 'ba1', patient: 'p12', title: 'Facettes céramiques 11–21', cat: 'Esthétique dentaire', before: D.addYmd(D.todayYmd(), -70), after: D.addYmd(D.todayYmd(), -30), shade: ['#E9D6A8', '#FBF8F1'], visibility: 'praticiens', consent: true },
    { id: 'ba2', patient: 'p1', title: 'Blanchiment (simulation projet)', cat: 'Blanchiment', before: D.addYmd(D.todayYmd(), -96), after: '', shade: ['#E4D3A6', '#F6F2E6'], visibility: 'praticiens', consent: true },
    { id: 'ba3', patient: 'p19', title: 'Orthodontie — 14 mois', cat: 'Orthodontie', before: D.addYmd(D.todayYmd(), -420), after: D.addYmd(D.todayYmd(), -5), shade: ['#F1E9D6', '#F6F1E6'], visibility: 'praticiens', consent: true, crowd: true },
    { id: 'ba4', patient: 'p7', title: 'Couronne 16', cat: 'Prothèses', before: D.addYmd(D.todayYmd(), -40), after: D.addYmd(D.todayYmd(), -15), shade: ['#D9C79B', '#F5F0E2'], visibility: 'equipe', consent: true },
    { id: 'ba5', patient: 'p6', title: 'Restauration composite 11', cat: 'Restaurations', before: D.addYmd(D.todayYmd(), -200), after: D.addYmd(D.todayYmd(), -199), shade: ['#E6D5A9', '#F7F2E5'], visibility: 'praticiens', consent: false }
  ];
  function buildRx() {
    const t = D.ymd(D.today());
    return [
      { id: 'rx1', patient: 'p1', dentist: 'd1', date: D.addYmd(t, -12), items: [{ drug: 'Paracétamol 1 g', pos: '1 comprimé toutes les 6 heures si douleur (max. 4/jour)', dur: '3 jours' }, { drug: 'Chlorhexidine 0,12 % bain de bouche', pos: '2 bains de bouche par jour après brossage', dur: '7 jours' }], notes: 'Allergie pénicilline déclarée — pas d’antibiotique prescrit.' },
      { id: 'rx2', patient: 'p15', dentist: 'd2', date: D.addYmd(t, -1), items: [{ drug: 'Amoxicilline 1 g', pos: '1 comprimé matin et soir', dur: '6 jours' }, { drug: 'Paracétamol 1 g', pos: '1 comprimé toutes les 6 heures si douleur', dur: '5 jours' }, { drug: 'Chlorhexidine 0,12 % bain de bouche', pos: '2 fois par jour à partir de J+1', dur: '10 jours' }], notes: 'Ordonnance post-opératoire implant 46.' },
      { id: 'rx3', patient: 'p7', dentist: 'd2', date: D.addYmd(t, -140), items: [{ drug: 'Ibuprofène 400 mg', pos: '1 comprimé 3 fois par jour pendant les repas', dur: '3 jours' }], notes: '' }
    ];
  }
  function buildGenDocs() {
    const t = D.ymd(D.today());
    return [
      { id: 'gd1', type: 'certificat', patient: 'p7', date: D.addYmd(t, -140), title: 'Certificat médical — arrêt 2 jours', dentist: 'd2' },
      { id: 'gd2', type: 'compte_rendu', patient: 'p1', date: D.addYmd(t, -12), title: 'Compte rendu — traitement endodontique 36', dentist: 'd1' },
      { id: 'gd3', type: 'plan', patient: 'p1', date: D.addYmd(t, -95), title: 'Plan de traitement — Réhabilitation & esthétique', dentist: 'd1' }
    ];
  }
  function buildAudit() {
    const t = D.today(); const ts = (off, h) => { const d = D.add(t, off); d.setHours(...h.split(':').map(Number)); return d.toISOString(); };
    const A = (at, user, action, target, ip = '10.0.1.' + int(10, 60)) => ({ at, user, action, target, ip });
    return [
      A(ts(0, '08:02'), 'Mounia Rahmani', 'Connexion (2FA)', 'Session web — Fès'),
      A(ts(0, '08:05'), 'Dr. Salma Bennani', 'Connexion (2FA)', 'Application mobile'),
      A(ts(0, '08:11'), 'Mounia Rahmani', 'Rendez-vous confirmé', 'Fatima Zahra El Amrani — 08:30'),
      A(ts(0, '08:40'), 'Dr. Salma Bennani', 'Consultation du dossier', 'Fatima Zahra El Amrani'),
      A(ts(-1, '17:22'), 'Adil Benomar', 'Export comptable', 'Paiements — septembre'),
      A(ts(-1, '16:05'), 'Dr. Youssef Alaoui', 'Ordonnance générée', 'Karim Mernissi'),
      A(ts(-1, '11:30'), 'Hajar Ziani', 'Réception commande', 'CMD-0225 — Hygiène Pro Santé'),
      A(ts(-2, '09:14'), 'Rachid El Ouali', 'Modification des permissions', 'Rôle Assistant(e)'),
      A(ts(-2, '09:10'), 'Rachid El Ouali', 'Connexion (2FA)', 'Session web — Direction'),
      A(ts(-3, '03:00'), 'Système', 'Sauvegarde chiffrée', 'Snapshot quotidien — 3 sites'),
      A(ts(-12, '16:48'), 'Dr. Salma Bennani', 'Odontogramme modifié', 'Ahmed Benali — dent 36'),
      A(ts(-12, '16:50'), 'Dr. Salma Bennani', 'Envoi au laboratoire', 'Couronne zircone 36 — Atlas Prothèse')
    ];
  }
  function buildNotifications() {
    const t = D.today(); const ts = (off, h) => { const d = D.add(t, off); d.setHours(...h.split(':').map(Number)); return d.toISOString(); };
    return [
      { id: 'n1', at: ts(0, '07:55'), kind: 'lab', title: 'Laboratoire : travail prêt', text: 'DentoLab Meknès signale que la prothèse amovible de Rachid Ouazzani est prête.', link: '#/laboratoire', read: false },
      { id: 'n2', at: ts(0, '07:52'), kind: 'msg', title: 'Nouveau message patient', text: 'Sara Bennis : « J’ai une douleur depuis hier soir… »', link: '#/communication/p8', read: false },
      { id: 'n3', at: ts(-1, '21:14'), kind: 'booking', title: 'Réservation en ligne', text: 'Nouveau rendez-vous pris en ligne pour demain.', link: '#/agenda', read: false },
      { id: 'n4', at: ts(-1, '18:30'), kind: 'review', title: 'Nouvel avis ★★★★★', text: '« Prise de rendez-vous en ligne ultra simple. »', link: '#/avis', read: true },
      { id: 'n5', at: ts(-1, '10:12'), kind: 'pay', title: 'Paiement en ligne reçu', text: 'Ahmed Benali — 1 000 DH (acompte couronne 36).', link: '#/paiements', read: true }
    ];
  }
  const HISTORY = (() => { // 12 derniers mois (agrégats) par site
    const out = {}; const base = { fes: [345000, 330, 42], meknes: [96000, 150, 18], rabat: [118000, 170, 22] };
    Object.entries(base).forEach(([c, [rev, cons, np]]) => {
      out[c] = Array.from({ length: 12 }, (_, i) => { const k = 0.82 + i * 0.022 + (R() - .5) * .12; const d = D.today(); d.setDate(1); d.setMonth(d.getMonth() - (11 - i)); return { m: D.ymd(d), revenue: Math.round(rev * k / 1000) * 1000, consults: Math.round(cons * k), newPatients: Math.round(np * (0.8 + R() * .5)), noshow: +(3 + R() * 4).toFixed(1), fill: Math.round(74 + i * .9 + R() * 6), recurrent: Math.round(cons * k * (0.6 + R() * .1)) }; });
    });
    return out;
  })();

  /* ---------- Construction ---------- */
  function build() {
    seed = 20260928;
    const patients = buildPatients();
    const appts = buildAppointments(patients);
    // no-shows par patient
    appts.forEach(a => { const p = patients.find(x => x.id === a.patient); if (!p) return; if (a.status === 'noshow') p.noShows++; if (a.late) p.lateCount++; });
    patients.forEach(p => { if (p.noShows >= 2) p.tags.push('Risque no-show'); });
    patients[0].tags = ['Fidèle', 'VIP']; patients[11].tags.push('Esthétique'); patients[14].tags.push('Implantologie');
    [12, 13, 18, 19].forEach(i => patients[i].tags.push('Orthodontie'));
    patients[0].notes = 'Préfère les rendez-vous en début d’après-midi. Anxieux au fraisage : séances courtes. Contact WhatsApp privilégié.';
    const fin = buildFinance(appts);
    return {
      v: 3, builtFor: D.todayYmd(),
      clinics: CLINICS, staff: STAFF, roles: ROLES, perms: PERMS, rolePerms: JSON.parse(JSON.stringify(ROLE_PERMS)), roleUser: ROLE_USER,
      types: TYPES, status: STATUS, acts: ACTS,
      patients, appts, consults: buildConsultations(appts), odonto: buildOdonto(), plans: buildPlans(),
      quotes: buildQuotes(), invoices: fin.invoices, payments: fin.payments, seq: { invoice: fin.nextInvoice + 1200, quote: 171, order: 233, rx: 4 },
      suppliers: SUPPLIERS, stock: buildStock(), orders: buildOrders(), labs: LABS, labCases: buildLab(),
      messages: buildMessages(), templates: TEMPLATES, rules: RULES, followups: buildFollowups(), reviews: buildReviews(patients),
      ortho: buildOrtho(), docs: buildDocs(), ba: BA, rx: buildRx(), gendocs: buildGenDocs(),
      audit: buildAudit(), notifications: buildNotifications(), history: HISTORY,
      reviewRequests: [], demoRequests: [],
      settings: {
        group: 'Centre Dentaire Atlas', legal: 'Atlas Dental Group SARL', ice: '002845119000045', inpe: '112233445', rc: 'Fès 58211',
        hours: { open: '08:30', close: '18:30', lunch: ['12:30', '14:00'], saturday: '13:00' },
        security: { twofa: true, sessionTimeout: 30, ipAllow: false, encryption: 'AES-256 au repos · TLS 1.3 en transit', backups: 'Quotidiennes chiffrées · rétention 35 jours · réplication hors site', lastBackup: D.ymd(D.add(D.today(), -1)) + 'T03:00:00' },
        booking: { enabled: true, minNotice: 2, maxDays: 45, types: ['consultation', 'controle', 'detartrage', 'urgence', 'orthodontie'] }
      },
      session: { role: 'admin', clinic: 'fes' }
    };
  }

  let S;
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); if (s && s.v === 3 && s.builtFor === D.todayYmd()) return s; if (s && s.v === 3) return rebase(s); } } catch (e) { }
    return build();
  }
  // Décale les dates d'un store sauvegardé les jours précédents pour garder une démo vivante
  function rebase(s) {
    const shift = D.diffDays(s.builtFor, D.todayYmd());
    if (!shift || Math.abs(shift) > 60) return build();
    const re = /^\d{4}-\d{2}-\d{2}/;
    const walk = o => { if (Array.isArray(o)) return o.forEach(walk); if (o && typeof o === 'object') Object.keys(o).forEach(k => { const v = o[k]; if (typeof v === 'string' && re.test(v) && k !== 'dob' && k !== 'created' && k !== 'm') { const base = v.slice(0, 10); o[k] = D.addYmd(base, shift) + v.slice(10); } else walk(v); }); };
    ['appts', 'consults', 'plans', 'quotes', 'invoices', 'payments', 'orders', 'labCases', 'messages', 'followups', 'reviews', 'ortho', 'docs', 'ba', 'rx', 'gendocs', 'audit', 'notifications'].forEach(k => walk(s[k]));
    Object.values(s.odonto || {}).forEach(o => walk(o.history));
    s.builtFor = D.todayYmd();
    return s;
  }
  S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { console.warn('Stockage local indisponible', e); } }
  save();

  const uid = p => p + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);

  window.Nacre = window.Nacre || {};
  Object.assign(window.Nacre, {
    D, get S() { return S; }, save, uid,
    reset() { localStorage.removeItem(KEY); S = build(); save(); },
    log(action, target) { const u = Nacre.me(); S.audit.unshift({ at: D.stamp(), user: u ? Nacre.name(u) : 'Patient (portail)', action, target, ip: '10.0.1.24' }); S.audit = S.audit.slice(0, 400); },
    notify(n) { S.notifications.unshift(Object.assign({ id: uid('n'), at: D.stamp(), read: false }, n)); },
    me() { return S.staff.find(s => s.id === S.roleUser[S.session.role]); },
    can(perm) { return (S.rolePerms[S.session.role] || []).includes(perm); },
    name(x) { if (!x) return '—'; return ((x.title ? x.title + ' ' : '') + x.first + ' ' + x.last).trim(); },
    pname(id) { const p = typeof id === 'string' ? S.patients.find(x => x.id === id) : id; return p ? p.first + ' ' + p.last : '—'; },
    patient(id) { return S.patients.find(p => p.id === id); },
    staff(id) { return S.staff.find(p => p.id === id); },
    clinic(id) { return S.clinics.find(c => c.id === id); },
    inClinic(x) { const c = S.session.clinic; return c === 'all' || !x || x.clinic === c || x.clinic === 'all'; },
    dentists() { return S.staff.filter(s => s.role === 'dentiste' && Nacre.inClinic(s)); },
    invoicePaid(inv) { return S.payments.filter(p => p.invoice === inv.id).reduce((s, p) => s + p.amount, 0); },
    invoiceTotal(inv) { const sub = inv.items.reduce((s, x) => s + x.qty * x.price, 0); return Math.round(sub * (1 - (inv.discount || 0) / 100)); },
    invoiceStatus(inv) { const paid = Nacre.invoicePaid(inv), tot = Nacre.invoiceTotal(inv); if (paid >= tot) return 'payee'; if (D.todayYmd() > inv.due) return paid > 0 ? 'retard_partiel' : 'retard'; return paid > 0 ? 'partielle' : 'impayee'; },
    patientBalance(pid) { const inv = S.invoices.filter(i => i.patient === pid); const total = inv.reduce((s, i) => s + Nacre.invoiceTotal(i), 0); const paid = S.payments.filter(p => p.patient === pid).reduce((s, p) => s + p.amount, 0); return { total, paid, due: total - paid }; },
    age(dob) { const d = D.parse(dob), t = new Date(); let a = t.getFullYear() - d.getFullYear(); if (t < new Date(t.getFullYear(), d.getMonth(), d.getDate())) a--; return a; }
  });
})();
