const cfg = require('./config');
const app = require('./app');
const { sequelize } = require('./models');
const { startScheduler } = require('./services/reminders');

(async () => {
  try {
    await sequelize.authenticate();
  } catch (e) {
    console.error(`✗ Connexion MySQL impossible (${cfg.db.host}:${cfg.db.port}/${cfg.db.name}) : ${e.message}`);
    console.error('  → Vérifiez que MySQL est démarré et lancez « npm run db:reset » pour créer la base.');
    process.exit(1);
  }
  app.listen(cfg.port, () => {
    console.log(`✓ API Nacre sur http://localhost:${cfg.port}  (MySQL ${cfg.db.host}/${cfg.db.name})`);
    startScheduler();
  });
})();
