// models/ServiceHistory.js
const { sequelize, DataTypes } = require("../db");

const ServiceHistory = sequelize.define("ServiceHistory", {
  vehicleId: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  maintenanceItem: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  serviceCenter: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  serviceDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

module.exports = ServiceHistory;
