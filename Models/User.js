// models/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../Config/sequelize');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('researcher', 'farmer', 'tourism_guide', 'marine_authority'),
        defaultValue: 'researcher'
    }
}, {
    tableName: 'users',
    timestamps: true
});

module.exports = User;
