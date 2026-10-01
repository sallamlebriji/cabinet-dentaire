const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const env = process.env;
if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
  console.warn('[config] JWT_SECRET absent ou trop court — définissez une valeur longue et aléatoire dans server/.env');
}

module.exports = {
  env: env.NODE_ENV || 'development',
  isProd: env.NODE_ENV === 'production',
  port: +env.PORT || 4600,
  clientOrigin: env.CLIENT_ORIGIN || 'http://localhost:5600',
  db: {
    host: env.DB_HOST || '127.0.0.1',
    port: +env.DB_PORT || 3306,
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    name: env.DB_NAME || 'nacre_dental'
  },
  jwtSecret: env.JWT_SECRET || 'dev-only-secret-change-me-dev-only-secret-change-me',
  sessionMinutes: +env.SESSION_MINUTES || 30,
  // Affiche les comptes de démonstration sur l'écran de connexion (par défaut : hors production)
  demoMode: env.DEMO_MODE ? env.DEMO_MODE === 'true' : env.NODE_ENV !== 'production',
  anthropicKey: env.ANTHROPIC_API_KEY || '',
  uploadDir: path.join(__dirname, '../../uploads')
};
