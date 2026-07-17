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
    provider: {
        type: DataTypes.ENUM('MPESA', 'NCBA', 'IM', 'CASH'),
        allowNull: false
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
