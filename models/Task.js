const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Task = sequelize.define('Task', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    status: {
        type: DataTypes.ENUM('Backlog', 'Todo', 'In Progress', 'Done'),
        defaultValue: 'Todo'
    },
    priority: {
        type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
        defaultValue: 'Medium'
    },
    assigneeId: { type: DataTypes.INTEGER, allowNull: true },
    reporterId: { type: DataTypes.INTEGER, allowNull: true },
    projectId: { type: DataTypes.INTEGER, allowNull: false },
    dueDate: { type: DataTypes.DATEONLY, allowNull: true },
    labels: { type: DataTypes.JSON, defaultValue: [] },
    attachments: { type: DataTypes.JSON, defaultValue: [] }, // Files/Reports linked to task
    issueLinks: { type: DataTypes.JSON, defaultValue: [] }, // Array of { type, linkedTaskId }
    watchers: { type: DataTypes.JSON, defaultValue: [] }, // Array of User IDs
    parentTaskId: { type: DataTypes.INTEGER, allowNull: true },
    storyPoints: { type: DataTypes.INTEGER, allowNull: true },
    issueType: {
        type: DataTypes.ENUM('Story', 'Task', 'Bug', 'Epic'), // Jira-like issue types
        defaultValue: 'Task'
    },
    originalEstimate: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 }, // in minutes
    remainingEstimate: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 }, // in minutes
    timeSpent: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 }, // in minutes
    timerStartTime: { type: DataTypes.DATE, allowNull: true }, // For tracking active timer
    lastHeartbeatAt: { type: DataTypes.DATE, allowNull: true } // For auto-stopping stalled timers
}, {
    paranoid: true,
    timestamps: true
});

module.exports = Task;