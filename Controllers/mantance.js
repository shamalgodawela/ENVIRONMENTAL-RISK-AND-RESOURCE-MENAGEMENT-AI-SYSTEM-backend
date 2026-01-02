const MantanceReco = require("../model/Mantance");



// Get all vehicles
exports.getMantance = async (req, res) => {
  try {
    const vehicles = await MantanceReco.findAll();
    res.json(vehicles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch vehicles", error: err.message });
  }
};

exports.createMantance = async (req, res) => {
  try {
    const newRecord = await MantanceReco.create(req.body);
    res.status(201).json(newRecord);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create record" });
  }
};

exports.bulkInsertMantace = async (req, res) => {
  try {
    console.log("📥 Bulk maintenance insert started");

    const payload = req.body.vehicleMaintenanceStandards;

    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "Invalid JSON structure" });
    }

    const records = [];

    for (const vehicleType in payload) {
      const items = payload[vehicleType];

      if (!Array.isArray(items)) continue;

      items.forEach((item, index) => {
        const record = {
          vehicle_type: vehicleType,

          maintenance_item: item.item || "UNKNOWN",

          // 🔥 NULL → "0"
          time_interval_months:
            item.timeIntervalMonths === null ||
            item.timeIntervalMonths === undefined
              ? "0"
              : item.timeIntervalMonths.toString(),

          // 🔥 NULL → "0"
          distance_km_range:
            item.distanceKm === null || item.distanceKm === undefined
              ? "0"
              : item.distanceKm.toString(),

          // must never be null
          pollution_impact:
            Array.isArray(item.pollutionImpact) && item.pollutionImpact.length
              ? item.pollutionImpact
              : ["UNKNOWN"],
        };

        console.log(`➡ Prepared [${vehicleType}] item ${index + 1}`, record);

        records.push(record);
      });
    }

    console.log("📊 Total records prepared:", records.length);

    const result = await MantanceReco.bulkCreate(records);

    console.log("✅ Bulk insert SUCCESS");

    res.json({
      message: "Bulk insert completed",
      insertedCount: result.length,
    });
  } catch (error) {
    console.error("❌ Bulk insert FAILED:", error);

    res.status(500).json({
      error: "Bulk insert failed",
      details: error.message,
    });
  }
};


// Get all distinct vehicle types
// Get all distinct vehicle types
exports.getVehicleTypes = async (req, res) => {
  try {
    const types = await MantanceReco.findAll({
      attributes: [
        [
          MantanceReco.sequelize.fn(
            'DISTINCT',
            MantanceReco.sequelize.col('vehicle_type')
          ),
          'vehicle_type'
        ]
      ],
      raw: true
    });

    res.json(types.map(t => t.vehicle_type));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch vehicle types" });
  }
};


