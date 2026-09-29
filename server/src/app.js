const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const { ZodError } = require('zod');
const cfg = require('./config');
const { requireStaff } = require('./middleware/auth');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use(cors({ origin: cfg.clientOrigin, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
if (!cfg.isProd) app.use(morgan('dev', { skip: req => req.path === '/api/counters' }));

// ---- API publique (site, réservation en ligne) et portail patient ----
app.get('/api/health', (req, res) => res.json({ ok: true, at: new Date().toISOString() }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/public', require('./routes/public'));
app.use('/api/portal', require('./routes/portal'));

// ---- API espace cabinet (authentifiée) ----
const staff = express.Router();
staff.use(requireStaff);
['meta', 'dashboard', 'patients', 'appointments', 'clinical', 'finance', 'documents', 'operations', 'relation', 'analytics', 'admin', 'assistant']
  .forEach(n => staff.use(require('./routes/' + n)));
app.use('/api', staff);

// ---- Client React compilé (production) ----
const dist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '7d', index: false }));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// ---- Erreurs ----
app.use('/api', (req, res) => res.status(404).json({ error: 'Route introuvable' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof ZodError) return res.status(400).json({ error: err.errors[0] ? `${err.errors[0].path.join('.') || 'Champ'} : ${err.errors[0].message}` : 'Données invalides', details: err.errors });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Fichier trop volumineux (max. 15 Mo)' });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 && cfg.isProd ? 'Erreur interne' : err.message });
});

module.exports = app;
