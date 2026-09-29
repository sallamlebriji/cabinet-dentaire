export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const MSHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
export const DSHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const pad = n => String(n).padStart(2, '0');
export const D = {
  ymd: d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
  parse: s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); },
  today: () => D.ymd(new Date()),
  add: (s, n) => { const d = D.parse(s); d.setDate(d.getDate() + n); return D.ymd(d); },
  min: t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; },
  hm: m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`,
  nowMin: () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); },
  diff: (a, b) => Math.round((D.parse(b) - D.parse(a)) / 864e5),
  monday: s => { const d = D.parse(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return D.ymd(d); }
};

const nf = new Intl.NumberFormat('fr-FR');
const clean = s => s.replace(/ | /g, ' ');
export const fmt = {
  money: n => clean(nf.format(Math.round(n || 0))) + ' DH',
  num: n => clean(nf.format(Math.round(n || 0))),
  k: n => (n >= 1e6 ? (n / 1e6).toFixed(2).replace('.', ',') + ' M' : n >= 1e3 ? Math.round(n / 1e3) + ' k' : String(Math.round(n || 0))),
  date: s => { if (!s) return '—'; const d = D.parse(s); return `${d.getDate()} ${MSHORT[d.getMonth()]} ${d.getFullYear()}`; },
  dateLong: s => { const d = D.parse(s); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; },
  dateLongCap: s => fmt.dateLong(s).replace(/^./, c => c.toUpperCase()),
  dayMonth: s => { const d = D.parse(s); return `${d.getDate()} ${MSHORT[d.getMonth()]}`; },
  dow: s => DSHORT[D.parse(s).getDay()],
  month: s => { const d = D.parse(s); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; },
  mshort: s => MSHORT[D.parse(s).getMonth()],
  rel: s => { if (!s) return '—'; const n = D.diff(D.today(), s); if (n === 0) return 'aujourd’hui'; if (n === 1) return 'demain'; if (n === -1) return 'hier'; if (n > 1 && n < 7) return `dans ${n} j`; if (n < 0 && n > -7) return `il y a ${-n} j`; return fmt.date(s); },
  ago: iso => { const m = Math.round((Date.now() - new Date(String(iso).replace(' ', 'T'))) / 60000); if (m < 1) return 'à l’instant'; if (m < 60) return `il y a ${m} min`; const h = Math.round(m / 60); if (h < 24) return `il y a ${h} h`; const j = Math.round(h / 24); return j === 1 ? 'hier' : `il y a ${j} j`; },
  time: iso => { const d = new Date(String(iso).replace(' ', 'T')); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; },
  hShort: t => (t || '').replace(':', 'h'),
  pct: n => (Math.round(n * 10) / 10).toString().replace('.', ',') + ' %',
  dec: (n, d = 1) => Number(n || 0).toFixed(d).replace('.', ',')
};

export const pname = p => (p ? `${p.first} ${p.last}` : '—');
export const sname = s => (s ? `${s.title ? s.title + ' ' : ''}${s.first} ${s.last}` : '—');
export const age = dob => { if (!dob) return '—'; const d = D.parse(dob), t = new Date(); let a = t.getFullYear() - d.getFullYear(); if (t < new Date(t.getFullYear(), d.getMonth(), d.getDate())) a--; return a; };
export const initials = x => (((x && x.first) || '')[0] || '') + (((x && x.last) || '')[0] || '');

export const METHOD = { especes: 'Espèces', carte: 'Carte', virement: 'Virement', en_ligne: 'Paiement en ligne', cheque: 'Chèque' };
export const INV_ST = { payee: ['Payée', 'st-termine'], partielle: ['Partielle', 'st-attente'], impayee: ['À régler', 'st-confirme'], retard: ['En retard', 'st-noshow'], retard_partiel: ['Retard (partiel)', 'st-noshow'] };
export const PLAN_ST = { propose: ['Proposé', 'tone-gray'], accepte: ['Accepté', 'tone-violet'], planifie: ['Planifié', 'st-confirme'], encours: ['En cours', 'st-encours'], termine: ['Terminé', 'st-termine'] };
export const PLAN_ORDER = ['propose', 'accepte', 'planifie', 'encours', 'termine'];
export const QUOTE_ST = { brouillon: ['Brouillon', 'tone-gray'], envoye: ['Envoyé', 'st-confirme'], accepte: ['Accepté', 'st-termine'], refuse: ['Refusé', 'st-noshow'], expire: ['Expiré', 'st-annule'] };
export const LAB_ST = { a_envoyer: ['À envoyer', 'tone-gray'], envoye: ['Envoyé', 'st-confirme'], fabrication: ['En fabrication', 'st-attente'], pret: ['Prêt', 'tone-teal'], recu: ['Reçu', 'st-termine'], livre: ['Livré au patient', 'tone-navy'] };
export const LAB_ORDER = ['a_envoyer', 'envoye', 'fabrication', 'pret', 'recu', 'livre'];
export const MC = { especes: '#5E9F8D', carte: '#2C6BCB', virement: '#12264A', en_ligne: '#B89457', cheque: '#9AA5B4' };

/** Remplace les variables {prenom}… d'un modèle de message */
export const fillTpl = (t, map) => t.replace(/\{(\w+)\}/g, (m, k) => (map[k] ?? m));
/** Téléchargement d'un fichier généré côté client */
export function downloadBlob(content, name, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
