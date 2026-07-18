const { DataTypes } = require('sequelize');
const sequelize = require('../services/db');

const PendingTransaction = sequelize.define('PendingTransaction', {
    userId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    rawSms: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('income', 'expense', 'transfer'),
        allowNull: false
    },
    counterparty: {
        type: DataTypes.STRING,
        allowNull: true
    },
    transactionReference: {
        type: DataTypes.STRING,
        allowNull: true
    },
    suggestedDescription: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'categorized', 'ignored'),
        defaultValue: 'pending'
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

module.exports = PendingTransaction;
