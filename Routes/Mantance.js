const express = require("express");
const router = express.Router();
const MantanceController = require("../Controllers/mantance");
const recommendationController = require("../Controllers/recommendation.controller");
const { sendWhatsAppMessage } = require("../Controllers/massage");



// Get all vehicles
router.get("/get", MantanceController.getMantance);
router.post("/add", MantanceController.createMantance);
router.post("/bulk", MantanceController.bulkInsertMantace);
router.get("/types", MantanceController.getVehicleTypes);
router.get("/recommendations", recommendationController.getRecommendations);
router.post("/send", sendWhatsAppMessage);


// Predict maintenance



module.exports = router;