// server.js
const express = require("express");
const cors = require("cors");
const { sequelize } = require("./db");
const vehicleRoutes = require("./Routes/Addvehicale");
const Pm25History = require("../backend/model/Pm25History");
const Prediction = require("../backend/model/Prediction");
require("dotenv").config();


const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Important to parse JSON body

const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const MODEL_SERVER = process.env.MODEL_SERVER_URL || "http://localhost:8000";

app.get("/api/predict", async (req, res) => {
  try {
    // 1️⃣ Fetch last 30 days
    const client = await pool.connect();
    const result = await client.query(`
      SELECT pm25, temperature, humidity, windspeed, precip, weekday
      FROM pm25_history
      ORDER BY date DESC
      LIMIT 30
    `);
    client.release();

    const rows = result.rows;

    if (rows.length < 30) {
      return res.status(400).json({
        error: `Not enough historical data — need 30 rows, found ${rows.length}`,
      });
    }

    // Convert to correct order (oldest → newest)
    const last_n_steps = rows.reverse().map((r) => [
      r.pm25,
      r.temperature,
      r.humidity,
      r.windspeed,
      r.precip,
      r.weekday,
    ]);

    // 2️⃣ Send to FastAPI
    const response = await fetch(
      `${MODEL_SERVER}/predict-multi?days=7`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ last_n_steps }),
      }
    );

    const data = await response.json();
    const preds = data.pm25_preds;

    // 3️⃣ Save predictions
    const client2 = await pool.connect();
    try {
      const insertSQL = `
        INSERT INTO predictions (pm25_pred, day_ahead, raw_input)
        VALUES ($1, $2, $3)
      `;

      for (let i = 0; i < preds.length; i++) {
        await client2.query(insertSQL, [
          preds[i],
          i + 1,
          JSON.stringify(last_n_steps),
        ]);
      }
    } finally {
      client2.release();
    }

    // Return to frontend
    return res.json({ preds });
  } catch (err) {
    console.error("Prediction error:", err);
    res.status(500).json({ error: err.message });
  }
});


// Routes
app.use("/api/vehicle", vehicleRoutes);


// Sync database and start server
sequelize.sync({ alter: true }) // keep alter: true for dev
  .then(() => {
    console.log("Database synced!");
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch(err => console.error("DB sync error:", err));
