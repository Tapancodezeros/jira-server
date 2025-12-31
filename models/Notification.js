const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Notification = sequelize.define('Notification', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.STRING, defaultValue: 'info' }, // 'info', 'success', 'warning', 'error'
    title: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT },
    read: { type: DataTypes.BOOLEAN, defaultValue: false },
    link: { type: DataTypes.STRING }, // e.g., '/tasks/10'
}, {
    timestamps: true
});

module.exports = Notification;
