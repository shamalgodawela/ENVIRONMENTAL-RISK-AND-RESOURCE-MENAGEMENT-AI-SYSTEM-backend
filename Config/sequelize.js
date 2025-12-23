// sequelize.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.PG_DATABASE, process.env.PG_USER, process.env.PG_PASSWORD, {
    host: process.env.PG_HOST,
    dialect: 'postgres'
});

sequelize.authenticate()
    .then(() => console.log('PostgreSQL connected via Sequelize'))
    .catch(err => console.log('Sequelize connection error: ' + err));

module.exports = sequelize;
