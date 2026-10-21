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
    // Set when the parsed SMS is a movement of money between the user's own
    // accounts (e.g. M-Pesa cash withdrawal -> Cash, agent deposit -> M-Pesa)
    fromProvider: {
        type: DataTypes.ENUM('MPESA', 'NCBA', 'IM', 'CASH'),
        allowNull: true
    },
    toProvider: {
        type: DataTypes.ENUM('MPESA', 'NCBA', 'IM', 'CASH'),
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
