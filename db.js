// db.js
const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize("mydb", "postgres", "Sam98", {
  host: "localhost",
  dialect: "postgres",
  port: 5432,
  logging: false, 
});

sequelize.authenticate()
  .then(() => console.log("Connected to PostgreSQL!"))
  .catch(err => console.error("DB connection error:", err));

module.exports = { sequelize, DataTypes };
