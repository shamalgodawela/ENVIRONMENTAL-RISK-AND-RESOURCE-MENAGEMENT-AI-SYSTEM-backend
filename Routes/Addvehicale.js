const express = require("express");
const router = express.Router();
const vehicleController = require("../Controllers/vehicleadd");

// Create a new vehicle
router.post("/add", vehicleController.createVehicle);

// Get all vehicles
router.get("/", vehicleController.getVehicles);

router.put("/update/:vehicleId", vehicleController.updateVehicleMaintenance);
router.get("/history/:vehicleId", vehicleController.getServiceHistory);
//router.get("/vehicle-ids", vehicleController.getVehicleIds);
router.delete("/delete/:vehicleId", vehicleController.deleteVehicleById);
router.get("/history", vehicleController.getAllServiceHistory);

router.post("/hiadd", vehicleController.addServiceHistory);






module.exports = router;

