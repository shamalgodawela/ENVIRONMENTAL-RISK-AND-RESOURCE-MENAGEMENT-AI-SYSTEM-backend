const MantanceReco = require("../model/Mantance");
const CoustomerVehicleReco = require("../model/Vehicle");


/* ================= HELPERS ================= */

// convert "1.5 Years", "6 Month", "2 Weeks" → months
function convertToMonths(value) {
  if (!value) return null;

  const v = value.toLowerCase();
  if (v.includes("year")) return parseFloat(v) * 12;
  if (v.includes("month")) return parseFloat(v);
  if (v.includes("week")) return parseFloat(v) / 4;
  return null;
}

// estimate km per month based on usage frequency
function estimateMonthlyKm(usage) {
  switch (usage?.toLowerCase()) {
    case "daily":
      return 25 * 30;   // 750 km/month
    case "weekly":
      return 150;       // 150 km/month
    case "monthly":
      return 80;        // occasional use
    default:
      return null;
  }
}


function convertToDays(value) {
  if (!value) return null;

  const v = value.toLowerCase();
  const num = parseFloat(v);

  if (v.includes("year")) return num * 365;
  if (v.includes("month")) return num * 30;
  if (v.includes("week")) return num * 7;

  return null;
}

function monthsToDays(months) {
  return months * 30;
}






// parse "15000-25000" → 15000
function parseKmRange(range) {
  if (!range) return null;
  return parseFloat(range.split("-")[0]);
}

/* ================= FIELD MAP ================= */

const vehicleFieldMap = {
  bike: {
    "Engine oil change": "lastOil",
    "Air filter clean/replace": "lastAir",
    "Spark plug replace": "lastSpark",
    "Catalytic converter check": "catconverter",
  },
  car: {
    "Engine oil change": "lastOil",
    "Air filter clean/replace": "lastAir",
    "Spark plug replace": "lastSpark",
    "Catalytic converter check": "catconverter",
    "Injector cleaning": "injectorcleaning",
    "EGR cleaning (diesel)": "EGRcleaning",
    "O₂ sensor replacement": "Osensor",
  },
  van: {
    "Engine oil change": "lastOil",
    "Air filter clean/replace": "lastAir",
    "Spark plug replace": "lastSpark",
    "Catalytic converter check": "catconverter",
    "Injector cleaning": "injectorcleaning",
    "EGR cleaning": "EGRcleaning",
    "DPF regeneration/clean": "DPFcleaning",
  },
  truck: {
    "Engine oil change": "lastOil",
    "Air filter clean/replace": "lastAir",
    "Spark plug replace": "lastSpark",
    "Catalytic converter check": "catconverter",
    "Injector service": "injectorcleaning",
    "EGR / DPF inspection": "EGRcleaning",
    "DPF regeneration/clean": "DPFcleaning",
    "Exhaust system inspection": "Exhaustsysteminspection",
  },
};

/* ================= CONTROLLER ================= */

exports.getRecommendations = async (req, res) => {
  try {
    const vehicles = await CoustomerVehicleReco.findAll();
    const standards = await MantanceReco.findAll();

    const results = [];

    vehicles.forEach(vehicle => {
      const monthlyKm = estimateMonthlyKm(vehicle.usageFrequency);
      const mapping = vehicleFieldMap[vehicle.vehicleType] || {};

      const relatedStandards = standards.filter(
        s => s.vehicle_type === vehicle.vehicleType
      );

      relatedStandards.forEach(rule => {
        let status = "OK";
        let basis = "TIME";
        let nextMaintenanceDays = null;

        const field = mapping[rule.maintenance_item];

        /* ================= TIME BASED ================= */
        if (rule.time_interval_months !== "0") {
          const intervalMonths = parseFloat(
            rule.time_interval_months.split("-")[0]
          );

          const intervalDays = monthsToDays(intervalMonths);
          const lastDoneDays = field
            ? convertToDays(vehicle[field])
            : null;

          if (!lastDoneDays) {
            status = "UNKNOWN";
          } else if (lastDoneDays >= intervalDays) {
            status = "OVERDUE";
            nextMaintenanceDays = 0;
          } else if (lastDoneDays >= intervalDays * 0.75) {
            status = "DUE SOON";
            nextMaintenanceDays = intervalDays - lastDoneDays;
          } else {
            nextMaintenanceDays = intervalDays - lastDoneDays;
          }

          results.push({
            vehicleId: vehicle.vehicleId,
            vehicleType: vehicle.vehicleType,
            maintenanceItem: rule.maintenance_item,
            status,
            basis: "TIME",
            lastDone: field ? vehicle[field] : null,
            nextMaintenanceDays,
            pollutionImpact: rule.pollution_impact,
          });

          return;
        }

        /* ================= DISTANCE BASED ================= */
        basis = "DISTANCE";

        const kmLimit = parseKmRange(rule.distance_km_range);

        if (!monthlyKm || !kmLimit) {
          status = "UNKNOWN";
        } else {
          const yearlyKm = monthlyKm * 12;

          if (yearlyKm >= kmLimit) {
            status = "OVERDUE";
            nextMaintenanceDays = 0;
          } else if (yearlyKm >= kmLimit * 0.75) {
            status = "DUE SOON";
            nextMaintenanceDays = Math.ceil(
              ((kmLimit - yearlyKm) / monthlyKm) * 30
            );
          } else {
            nextMaintenanceDays = Math.ceil(
              ((kmLimit - yearlyKm) / monthlyKm) * 30
            );
          }
        }

        results.push({
          vehicleId: vehicle.vehicleId,
          vehicleType: vehicle.vehicleType,
          maintenanceItem: rule.maintenance_item,
          status,
          basis,
          estimatedAnnualKm: monthlyKm ? monthlyKm * 12 : null,
          nextMaintenanceDays,
          pollutionImpact: rule.pollution_impact,
        });
      });
    });

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
