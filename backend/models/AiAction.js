const { DataTypes } = require('sequelize');
const sequelize = require('../services/db');

/**
 * Audit trail for actions the AI took on the user's behalf.
 *
 * Every tool call is recorded here — whether it was executed straight away or
 * held back waiting for the user to confirm it. That makes it possible to
 * answer "what did the AI change on my ledger?" at any point.
 */
const AiAction = sequelize.define('AiAction', {
    userId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // Tool that was requested (list_transactions, update_transaction, ...)
    tool: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // Arguments the model passed to the tool
    parameters: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {}
    },
    // Human readable one-liner, e.g. "Updated transaction #12 (category)"
    summary: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // Whether the user had to approve this before it ran
    requiresConfirmation: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'executed', 'cancelled', 'failed'),
        allowNull: false,
        defaultValue: 'pending'
    },
    // Outcome of the action
    result: {
        type: DataTypes.JSON,
        allowNull: true
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

module.exports = AiAction;
