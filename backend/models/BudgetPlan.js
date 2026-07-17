const { DataTypes } = require('sequelize');
const sequelize = require('../services/db');

const BudgetPlan = sequelize.define('BudgetPlan', {
    userId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    totalBudget: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    period: {
        type: DataTypes.ENUM('weekly', 'monthly', 'semester'),
        defaultValue: 'monthly'
    },
    essentialsPct: {
        type: DataTypes.FLOAT,
        defaultValue: 70
    },
    miscPct: {
        type: DataTypes.FLOAT,
        defaultValue: 30
    },
    categories: {
        type: DataTypes.TEXT,
        defaultValue: '[]',
        get() {
            const raw = this.getDataValue('categories');
            try { return JSON.parse(raw); } catch { return []; }
        },
        set(val) {
            this.setDataValue('categories', JSON.stringify(val || []));
        }
    }
}, { timestamps: true });

module.exports = BudgetPlan;
