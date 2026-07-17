const { DataTypes } = require('sequelize');
const sequelize = require('../services/db');

const User = sequelize.define('User', {
    userId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    weeklyLimit: {
        type: DataTypes.FLOAT,
        defaultValue: 2500
    },
    savingsPercentage: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    }
}, { timestamps: true });

User.findOrCreateByUserId = async function (userId) {
    let user = await this.findOne({ where: { userId } });
    if (!user) {
        user = await this.create({
            userId,
            name: 'Student',
            email: `${userId}@uniflow.app`
        });
    }
    return user;
};

module.exports = User;
