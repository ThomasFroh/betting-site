const { Sequelize } = require('sequelize')
const config = require('./utils/config')
const mysql = require('mysql2')

const sequelize = new Sequelize(config.DB_NAME, config.DB_USER, config.DB_PASSWORD, {
  host: config.DB_HOST,
  port: config.DB_PORT || 3306,
  dialect: 'mysql',
});

module.exports = sequelize;

// const connection = mysql.createConnection({
//     host: process.env.DB_HOST,
//     port: process.env.DB_PORT || 3306,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_HOST
//   });

// module.exports = connection