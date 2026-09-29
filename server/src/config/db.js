const { Sequelize } = require('sequelize');
const { db } = require('./index');

const sequelize = new Sequelize(db.name, db.user, db.password, {
  host: db.host,
  port: db.port,
  dialect: 'mysql',
  logging: false,
  timezone: '+01:00',
  dialectOptions: { dateStrings: true, typeCast: true },
  define: { underscored: true, timestamps: true, charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
  pool: { max: 10, min: 0, idle: 10000 }
});

module.exports = sequelize;
