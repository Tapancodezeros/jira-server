const sequelize = require('../config/db');
const User = require('./User');
const Project = require('./Project');
const Task = require('./Task');
const ProjectMember = require('./ProjectMember');
const Notification = require('./Notification');
const Comment = require('./Comment');
const Activity = require('./Activity');
const WorkLog = require('./WorkLog');

// User <-> Project
User.hasMany(Project, { foreignKey: 'ownerId', as: 'ownedProjects' });
Project.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

User.hasMany(Project, { foreignKey: 'teamLeaderId', as: 'managedProjects' });
Project.belongsTo(User, { foreignKey: 'teamLeaderId', as: 'teamLeader' });

// Project <-> Task
Project.hasMany(Task, { foreignKey: 'projectId', onDelete: 'CASCADE' });
Task.belongsTo(Project, { foreignKey: 'projectId' });

// Project <-> User (many-to-many via ProjectMember)
Project.belongsToMany(User, { through: ProjectMember, foreignKey: 'projectId', otherKey: 'userId', as: 'members' });
User.belongsToMany(Project, { through: ProjectMember, foreignKey: 'userId', otherKey: 'projectId', as: 'memberProjects' });

// User <-> Task
User.hasMany(Task, { foreignKey: 'assigneeId', as: 'assignedTasks' });
Task.belongsTo(User, { foreignKey: 'assigneeId', as: 'assignee' });

User.hasMany(Task, { foreignKey: 'reporterId', as: 'reportedTasks' });
Task.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });

// User <-> Notification
User.hasMany(Notification, { foreignKey: 'userId', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId' });

// Task <-> Comment
Task.hasMany(Comment, { foreignKey: 'taskId', as: 'comments', onDelete: 'CASCADE' });
Comment.belongsTo(Task, { foreignKey: 'taskId' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'author' });

// Task <-> Activity
Task.hasMany(Activity, { foreignKey: 'taskId', as: 'activities', onDelete: 'CASCADE' });
Activity.belongsTo(Task, { foreignKey: 'taskId' });
Activity.belongsTo(User, { foreignKey: 'userId', as: 'actor' });

// Task hierarchy (Subtasks)
Task.hasMany(Task, { foreignKey: 'parentTaskId', as: 'subtasks', onDelete: 'CASCADE' });
Task.belongsTo(Task, { foreignKey: 'parentTaskId', as: 'parentTask' });

// Task <-> WorkLog
Task.hasMany(WorkLog, { foreignKey: 'taskId', as: 'workLogs', onDelete: 'CASCADE' });
WorkLog.belongsTo(Task, { foreignKey: 'taskId' });
WorkLog.belongsTo(User, { foreignKey: 'userId', as: 'author' });

module.exports = { sequelize, User, Project, Task, ProjectMember, Notification, Comment, Activity, WorkLog };