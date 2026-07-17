const { DataTypes } = require('sequelize');
const sequelize = require('../services/db');

const ChatMessage = sequelize.define('ChatMessage', {
    userId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('user', 'assistant'),
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    }
}, { timestamps: true });

module.exports = ChatMessage;
