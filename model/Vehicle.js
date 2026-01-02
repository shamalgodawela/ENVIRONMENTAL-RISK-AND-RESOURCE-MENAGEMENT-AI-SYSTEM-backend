const { sequelize, DataTypes } = require("../db");

const CoustomerVehicleReco = sequelize.define(
  "CoustomerVehicleReco",
 {
    vehicleId: {
      type: DataTypes.STRING,
      allowNull: false,
       unique: true,
    },

    model: DataTypes.STRING,
    odometer: DataTypes.STRING,
    currentCity: DataTypes.STRING,
    usageFrequency: DataTypes.STRING,
    vehicleType: DataTypes.STRING,

    /* ===== Maintenance ===== */
    lastOil: DataTypes.STRING,
    lastAir: DataTypes.STRING,
    lastSpark: DataTypes.STRING,
    catconverter: DataTypes.STRING,
    Osensor: DataTypes.STRING,
    injectorcleaning: DataTypes.STRING,
    EGRcleaning: DataTypes.STRING,
    DPFcleaning: DataTypes.STRING,
    Exhaustsysteminspection: DataTypes.STRING,

    /* ===== Emissions ===== */
    hc: DataTypes.STRING,
    co: DataTypes.STRING,
    co2: DataTypes.STRING,
    testDate: DataTypes.STRING,

    phone: DataTypes.STRING,
  },
  {
    timestamps: true,
  }
);

module.exports = CoustomerVehicleReco;

