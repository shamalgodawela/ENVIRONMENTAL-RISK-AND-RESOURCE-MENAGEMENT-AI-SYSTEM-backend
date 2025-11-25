const { sequelize, DataTypes } = require("../db");

const Vehicle = sequelize.define(
  "Vehicle",
  {
    vehicleId: DataTypes.STRING,
    model: DataTypes.STRING,
    odometer: DataTypes.STRING,
    currentCity: DataTypes.STRING,

    // Changed field name to match frontend
    usageFrequency: DataTypes.STRING, // was rideDirection

    vehicleType: DataTypes.STRING,
    lastOil: DataTypes.STRING,
    lastAir: DataTypes.STRING,
    lastSpark: DataTypes.STRING,
    lastChain: DataTypes.STRING,
    lastBrake: DataTypes.STRING,
    lastTyre: DataTypes.STRING,

    hc: DataTypes.STRING,
    co: DataTypes.STRING,
    co2: DataTypes.STRING,
    testDate: DataTypes.STRING,
  },
  {
    timestamps: true,
  }
);

module.exports = Vehicle;

