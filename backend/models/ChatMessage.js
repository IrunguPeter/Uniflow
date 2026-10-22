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
    },
    // Extra info about the turn — which tools the AI ran, what it changed
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, { timestamps: true });

module.exports = ChatMessage;
