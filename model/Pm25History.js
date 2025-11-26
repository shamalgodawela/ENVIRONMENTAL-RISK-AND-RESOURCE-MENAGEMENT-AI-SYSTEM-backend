const { sequelize, DataTypes } = require("../db");

const Pm25History = sequelize.define(
  "Pm25History",
  {
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    pm25: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    temperature: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    humidity: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    windspeed: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    precip: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    weekday: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "pm25_history",
    timestamps: false, // no createdAt/updatedAt
  }
);

module.exports = Pm25History;
