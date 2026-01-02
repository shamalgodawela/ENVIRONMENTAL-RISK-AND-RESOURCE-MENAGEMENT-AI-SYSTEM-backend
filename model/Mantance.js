const { sequelize, DataTypes } = require("../db");

const MantanceReco = sequelize.define(
    "MantanceReco",
    {
      vehicle_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      maintenance_item: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      time_interval_months: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "0",
      },

      distance_km_range: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "0",
      },

      pollution_impact: {
        type: DataTypes.JSON,
        allowNull: false,
      },
    },
    {
      tableName: "MantanceReco",
      timestamps: false,
    }
  );

module.exports = MantanceReco;
