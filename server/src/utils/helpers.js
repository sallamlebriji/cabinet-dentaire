const crypto = require('crypto');

const pad = n => String(n).padStart(2, '0');
const D = {
  ymd: d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
  parse: s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); },
  today: () => D.ymd(new Date()),
  add: (s, n) => { const d = D.parse(s); d.setDate(d.getDate() + n); return D.ymd(d); },
  min: t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; },
  hm: m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`,
  nowMin: () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); },
  diff: (a, b) => Math.round((D.parse(b) - D.parse(a)) / 864e5),
  monthStart: () => D.today().slice(0, 8) + '01'
};

const uid = (p = '') => p + Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
const money = n => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)).replace(/ | /g, ' ') + ' DH';
const pname = p => (p ? `${p.first} ${p.last}` : '—');
const staffName = s => (s ? `${s.title ? s.title + ' ' : ''}${s.first} ${s.last}` : '—');

/** Erreur HTTP typée */
class HttpError extends Error { constructor(status, message, details) { super(message); this.status = status; this.details = details; } }
const httpError = (status, message, details) => new HttpError(status, message, details);

/** Enveloppe async pour Express */
const ah = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { D, uid, money, pname, staffName, HttpError, httpError, ah };
