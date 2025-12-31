const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProjectMember = sequelize.define('ProjectMember', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    projectId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false }
});

module.exports = ProjectMember;
