const { DataTypes } = require('sequelize');
const sequelize = require('../services/db');

const Transaction = sequelize.define('Transaction', {
    userId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    currency: {
        type: DataTypes.STRING,
        defaultValue: 'KES'
    },
    type: {
        type: DataTypes.ENUM('income', 'expense', 'transfer'),
        allowNull: false
    },
    category: {
        type: DataTypes.STRING,
        defaultValue: 'Uncategorized'
    },
    // Account the money left from (or was recorded against)
    provider: {
        type: DataTypes.ENUM('MPESA', 'NCBA', 'IM', 'CASH'),
        allowNull: false
    },
    // Destination account — only set for transfers between the user's own accounts
    toProvider: {
        type: DataTypes.ENUM('MPESA', 'NCBA', 'IM', 'CASH'),
        allowNull: true
    },
    description: {
        type: DataTypes.STRING,
        allowNull: false
    },
    transactionReference: {
        type: DataTypes.STRING,
        unique: true
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

module.exports = Transaction;
