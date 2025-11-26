const { sequelize, DataTypes } = require("../db");

const Prediction = sequelize.define(
  "Prediction",
  {
    pm25_pred: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    day_ahead: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    raw_input: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
  },
  {
    tableName: "predictions",
    timestamps: false, // keeps createdAt field
  }
);

module.exports = Prediction;
