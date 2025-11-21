// db.js
const { Client } = require("pg");

const client = new Client({
    user: "postgres",
    host: "localhost",
    database: "postgres",
    password: "shamal2458",
    port: 5432,
});

client.connect()
    .then(() => console.log("Connected to PostgreSQL database successfully!"))
    .catch(err => console.error("Database connection error:", err.stack));

module.exports = client;
