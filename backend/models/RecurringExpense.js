const { DataTypes } = require('sequelize');
const sequelize = require('../services/db');

const RecurringExpense = sequelize.define('RecurringExpense', {
    userId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    frequency: {
        type: DataTypes.ENUM('weekly', 'monthly', 'semester'),
        allowNull: false,
        defaultValue: 'monthly'
    },
    category: {
        type: DataTypes.STRING,
        defaultValue: 'Other'
    },
    type: {
        type: DataTypes.ENUM('expense', 'income'),
        defaultValue: 'expense'
    }
}, { timestamps: true });

module.exports = RecurringExpense;
