const CoustomerVehicleReco = require("../model/Vehicle");
const ServiceHistory = require("../model/ServiceHistory");

// 🔁 DB field → Human readable maintenance name
const fieldToMaintenanceItem = {
  lastOil: "Engine oil change",
  lastAir: "Air filter clean/replace",
  lastSpark: "Spark plug replace",
  catconverter: "Catalytic converter",
  Osensor: "O₂ Sensor",
  injectorcleaning: "Injector Cleaning",
  EGRcleaning: "EGR Cleaning",
  DPFcleaning: "DPF Cleaning",
  Exhaustsysteminspection: "Exhaust Inspection",
};


// Create a new vehicle
exports.createVehicle = async (req, res) => {
  try {
    const vehicle = await CoustomerVehicleReco.create({
      vehicleId: req.body.vehicleId,
      model: req.body.model,
      odometer: req.body.odometer,
      currentCity: req.body.currentCity,
      usageFrequency: req.body.usageFrequency,
      vehicleType: req.body.vehicleType,

      lastOil: req.body.lastOil,
      lastAir: req.body.lastAir,
      lastSpark: req.body.lastSpark,
      catconverter: req.body.catconverter,
      Osensor: req.body.Osensor,
      injectorcleaning: req.body.injectorcleaning,
      EGRcleaning: req.body.EGRcleaning,
      DPFcleaning: req.body.DPFcleaning,
      Exhaustsysteminspection: req.body.Exhaustsysteminspection,

      hc: req.body.hc,
      co: req.body.co,
      co2: req.body.co2,
      testDate: req.body.testDate,

      phone: req.body.phone,
    });

    res.status(201).json({
      message: "Vehicle saved successfully ✅",
      vehicle,
    });
  } catch (error) {
    console.error("Save vehicle error:", error);
    res.status(500).json({
      message: "Failed to save vehicle ❌",
      error: error.message,
    });
  }
};

// Get all vehicles
exports.getVehicles = async (req, res) => {
  try {
    const vehicles = await CoustomerVehicleReco.findAll();
    res.json(vehicles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch vehicles", error: err.message });
  }
};


exports.updateVehicleMaintenance = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { updates } = req.body;

    if (!vehicleId || !updates || typeof updates !== "object") {
      return res.status(400).json({ message: "Invalid payload" });
    }

    const vehicle = await CoustomerVehicleReco.findOne({ where: { vehicleId } });

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const allowedFields = [
      "lastOil",
      "lastAir",
      "lastSpark",
      "catconverter",
      "Osensor",
      "injectorcleaning",
      "EGRcleaning",
      "DPFcleaning",
      "Exhaustsysteminspection",
    ];

    const historyRecords = [];

    for (const field of allowedFields) {
      if (
        updates[field] !== undefined &&
        updates[field] !== vehicle[field]
      ) {
        // ✅ Update vehicle field
        vehicle[field] = updates[field];

        // ✅ Save service history
        historyRecords.push({
          vehicleId,
          maintenanceItem: fieldToMaintenanceItem[field],
          notes: `Updated to ${updates[field]}`,
        });
      }
    }

    await vehicle.save();

    if (historyRecords.length > 0) {
      await ServiceHistory.bulkCreate(historyRecords);
    }

    res.json({
      message: "Vehicle updated and service history saved ✅",
      vehicle,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};



exports.getServiceHistory = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const history = await ServiceHistory.findAll({
      where: { vehicleId },
      order: [["serviceDate", "DESC"]],
    });

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all vehicle IDs
exports.getVehicleIds = async (req, res) => {
  try {
    const vehicles = await CoustomerVehicleReco.findAll({
      attributes: ["vehicleId"],
    });

    res.json(vehicles.map(v => v.vehicleId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get ALL service history (all vehicles)
exports.getAllServiceHistory = async (req, res) => {
  try {
    const history = await ServiceHistory.findAll({
      order: [["serviceDate", "DESC"]],
    });

    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};



// ❌ Delete vehicle and all related service history
exports.deleteVehicleById = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    if (!vehicleId) {
      return res.status(400).json({ message: "Vehicle ID is required" });
    }

    // 🔍 Check if vehicle exists
    const vehicle = await CoustomerVehicleReco.findOne({
      where: { vehicleId },
    });

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    // 🗑️ Delete service history first
    await ServiceHistory.destroy({
      where: { vehicleId },
    });

    // 🗑️ Delete vehicle
    await CoustomerVehicleReco.destroy({
      where: { vehicleId },
    });

    res.json({
      message: `Vehicle ${vehicleId} and all service history deleted ✅`,
    });
  } catch (err) {
    console.error("Delete vehicle error:", err);
    res.status(500).json({ error: err.message });
  }
};


// Add new service history record
exports.addServiceHistory = async (req, res) => {
  try {
    const {
      vehicleId,
      maintenanceItem,
      serviceCenter,
      notes,
      serviceDate,
    } = req.body;

    // 🔴 Basic validation
    if (!vehicleId || !maintenanceItem) {
      return res.status(400).json({
        message: "vehicleId and maintenanceItem are required",
      });
    }

    const history = await ServiceHistory.create({
      vehicleId,
      maintenanceItem,
      serviceCenter: serviceCenter || null,
      notes: notes || null,
      serviceDate: serviceDate || new Date(),
    });

    res.status(201).json({
      message: "Service history added successfully ✅",
      history,
    });
  } catch (err) {
    console.error("Add service history error:", err);
    res.status(500).json({ error: err.message });
  }
};




