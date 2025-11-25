const Vehicle = require("../model/Vehicle");

// Create a new vehicle
exports.createVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.create({
      vehicleId: req.body.vehicleId,
      model: req.body.model,
      odometer: req.body.odometer,
      currentCity: req.body.currentCity,
      usageFrequency: req.body.usageFrequency, // updated field
      vehicleType: req.body.vehicleType,
      lastOil: req.body.lastOil,
      lastAir: req.body.lastAir,
      lastSpark: req.body.lastSpark,
      lastChain: req.body.lastChain,
      lastBrake: req.body.lastBrake,
      lastTyre: req.body.lastTyre,
      hc: req.body.hc,
      co: req.body.co,
      co2: req.body.co2,
      testDate: req.body.testDate,
    });

    res.status(201).json({ message: "Vehicle saved successfully", vehicle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save vehicle", error: err.message });
  }
};

// Get all vehicles
exports.getVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.findAll();
    res.json(vehicles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch vehicles", error: err.message });
  }
};

// Get vehicle by ID
exports.getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }
    res.json(vehicle);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch vehicle", error: err.message });
  }
};
