const express = require("express");
const router = express.Router();
const vehicleController = require("../Controllers/vehicleadd");

// Create a new vehicle
router.post("/add", vehicleController.createVehicle);

// Get all vehicles
router.get("/", vehicleController.getVehicles);

// Get vehicle by ID
router.get("/:id", vehicleController.getVehicleById);

module.exports = router;

