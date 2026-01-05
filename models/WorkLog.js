const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const WorkLog = sequelize.define('WorkLog', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    taskId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    timeSpent: { type: DataTypes.INTEGER, allowNull: false }, // in minutes
    startedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    description: { type: DataTypes.TEXT }
}, {
    timestamps: true
});

module.exports = WorkLog;
