const { DataTypes } = require('sequelize');
const sequelize = require('../services/db');

const SavingsGoal = sequelize.define('SavingsGoal', {
    userId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    targetAmount: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    currentAmount: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    targetDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    category: {
        type: DataTypes.STRING,
        defaultValue: 'Savings'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, { timestamps: true });

module.exports = SavingsGoal;
