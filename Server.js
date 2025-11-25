// server.js
const express = require("express");
const cors = require("cors");
const { sequelize } = require("./db");
const vehicleRoutes = require("./Routes/Addvehicale");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Important to parse JSON body


// Routes
app.use("/api/vehicle", vehicleRoutes);


// Sync database and start server
sequelize.sync({ alter: true }) // keep alter: true for dev
  .then(() => {
    console.log("Database synced!");
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch(err => console.error("DB sync error:", err));
