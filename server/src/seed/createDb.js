/* Crée la base (si absente) puis (re)crée toutes les tables. ⚠ Détruit les données existantes de la base Nacre. */
const mysql = require('mysql2/promise');
const { db } = require('../config');

(async () => {
  const conn = await mysql.createConnection({ host: db.host, port: db.port, user: db.user, password: db.password });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();
  const models = require('../models');
  await models.sequelize.sync({ force: true });
  console.log(`✓ Base « ${db.name} » prête (${Object.keys(models.sequelize.models).length} tables)`);
  await models.sequelize.close();
})().catch(e => { console.error('✗ Création de la base impossible :', e.message); process.exit(1); });
