// db.js
const { Client } = require("pg");

const client = new Client({
    user: "postgres",
    host: "localhost",
    database: "mydb",
    password: "Sam98",
    port: 5000,
});

client.connect()
    .then(() => console.log("Connected to PostgreSQL database successfully!"))
    .catch(err => console.error("Database connection error:", err.stack));

module.exports = client;
