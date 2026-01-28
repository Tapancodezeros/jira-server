const express = require('express');
const router = express.Router();
const { Task, User, Notification, Comment, Activity, WorkLog } = require('../models/index');
const authMiddleware = require('../middleware/authMiddleware');

// Get tasks for a project with Search & Filter
// Get tasks for a project (Explicit path to avoid conflict with /:id)
router.get('/project/:projectId', authMiddleware, async (req, res) => {
    try {
        const { search, status, priority, assigneeId } = req.query;
        const { Op } = require('sequelize');

        const whereClause = { projectId: req.params.projectId };

        // Search Filter (Title or Description)
        if (search) {
            whereClause[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ];
        }

        // Status Filter
        if (status) {
            // handle multiple statuses if comma separated
            whereClause.status = status.includes(',') ? { [Op.in]: status.split(',') } : status;
        }

        // Priority Filter
        if (priority) {
            whereClause.priority = priority.includes(',') ? { [Op.in]: priority.split(',') } : priority;
        }

        // Assignee Filter
        if (assigneeId) {
            whereClause.assigneeId = assigneeId;
        }

        const tasks = await Task.findAll({
            where: whereClause,
            include: [
                { model: User, as: 'assignee', attributes: ['name', 'id'] },
                { model: User, as: 'reporter', attributes: ['name', 'id'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(tasks);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Create Task
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { title, description, projectId, assigneeId, status, priority, dueDate, labels, parentTaskId } = req.body;

        // validate assigneeId if provided
        let finalAssignee = null;
        if (assigneeId !== undefined && assigneeId !== null && assigneeId !== '') {
            const idNum = Number(assigneeId);
            if (Number.isNaN(idNum)) return res.status(400).json({ message: 'Invalid assigneeId' });
            const user = await User.findByPk(idNum);
            if (!user) return res.status(400).json({ message: `Assignee with id ${idNum} does not exist` });
            finalAssignee = idNum;
        }

        const task = await Task.create({
            title, description, projectId, assigneeId: finalAssignee, status, priority,
            dueDate: dueDate || null,
            labels: labels || [],
            attachments: req.body.attachments || [],
            parentTaskId: parentTaskId || null,
            storyPoints: req.body.storyPoints || null,
            issueType: req.body.issueType || 'Task',
            reporterId: req.user.id,
            issueLinks: req.body.issueLinks || [],
            watchers: req.body.watchers || []
        });

        // Log creation activity
        await Activity.create({
            taskId: task.id,
            userId: req.user.id,
            type: 'create',
            description: 'created this task'
        });

        if (finalAssignee) {
            await Notification.create({
                userId: finalAssignee,
                title: 'New Task Assigned',
                message: `You have been assigned to task: ${title}`,
                type: 'info',
                link: `/project/${projectId}`
            });
            // Log assignment
            await Activity.create({
                taskId: task.id,
                userId: req.user.id,
                type: 'update',
                description: `assigned to user #${finalAssignee}`
            });
        }
        res.status(201).json(task);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Get Single Task
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id, {
            include: [
                { model: User, as: 'assignee', attributes: ['name', 'id', 'email', 'avatar'] },
                { model: User, as: 'reporter', attributes: ['name', 'id'] }
            ]
        });
        if (!task) return res.status(404).json({ message: 'Task not found' });
        res.json(task);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Update Task (Drag and Drop status change + details edit)
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id);
        if (task) {
            const oldAssignee = task.assigneeId;
            const oldStatus = task.status;
            const oldPriority = task.priority;

            // Check subtask completion if moving to Done
            if (req.body.status === 'Done' && oldStatus !== 'Done') {
                const subtaskCount = await Task.count({ where: { parentTaskId: task.id } });
                if (subtaskCount > 0) {
                    const { Op } = require('sequelize');
                    const incompleteSubtasks = await Task.count({
                        where: {
                            parentTaskId: task.id,
                            status: { [Op.ne]: 'Done' }
                        }
                    });
                    if (incompleteSubtasks > 0) {
                        return res.status(400).json({ message: 'Cannot complete task. All subtasks must be completed first.' });
                    }
                }
            }

            await task.update(req.body);

            // Log Status Change
            if (req.body.status && req.body.status !== oldStatus) {
                await Activity.create({
                    taskId: task.id,
                    userId: req.user.id,
                    type: 'status',
                    description: `changed status from ${oldStatus} to ${req.body.status}`
                });
            }

            // Log Priority Change
            if (req.body.priority && req.body.priority !== oldPriority) {
                await Activity.create({
                    taskId: task.id,
                    userId: req.user.id,
                    type: 'priority',
                    description: `changed priority from ${oldPriority} to ${req.body.priority}`
                });
            }

            // Log Assignment Change
            if (req.body.assigneeId && Number(req.body.assigneeId) !== oldAssignee) {
                const newAssigneeId = Number(req.body.assigneeId);
                const newAssignee = await User.findByPk(newAssigneeId);
                const assigneeName = newAssignee ? newAssignee.name : 'Unknown';

                await Activity.create({
                    taskId: task.id,
                    userId: req.user.id,
                    type: 'assign',
                    description: `assigned to ${assigneeName}`
                });

                await Notification.create({
                    userId: newAssigneeId,
                    title: 'Task Assignment Update',
                    message: `You have been assigned to task: ${task.title}`,
                    type: 'info',
                    link: `/project/${task.projectId}`
                });
            }
            res.json(task);
        } else {
            res.status(404).json({ message: 'Task not found' });
        }
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Delete Task
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const force = req.query.permanent === 'true';
        console.log(`Deleting task ${req.params.id}. Force: ${force}`);
        const task = await Task.findByPk(req.params.id, { paranoid: !force });

        if (task) {
            await task.destroy({ force });
            console.log(`Task ${req.params.id} deleted. DeletedAt: ${task.deletedAt}`);
            return res.json({ success: true });
        }
        res.status(404).json({ message: 'Task not found' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ message: error.message });
    }
});

// Restore a soft-deleted task
router.post('/:id/restore', authMiddleware, async (req, res) => {
    try {
        // restore by id
        await Task.restore({ where: { id: req.params.id } });
        const task = await Task.findByPk(req.params.id);
        if (task) return res.json(task);
        res.status(404).json({ message: 'Task not found after restore' });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- Comments ---

// Get comments for a task
router.get('/:id/comments', authMiddleware, async (req, res) => {
    try {
        const comments = await Comment.findAll({
            where: { taskId: req.params.id },
            include: [{ model: User, as: 'author', attributes: ['name', 'id'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(comments);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Add a comment
router.post('/:id/comments', authMiddleware, async (req, res) => {
    try {
        const { content } = req.body;
        const comment = await Comment.create({
            content,
            taskId: req.params.id,
            userId: req.user.id
        });
        // fetch with author
        const fullComment = await Comment.findByPk(comment.id, {
            include: [{ model: User, as: 'author', attributes: ['name', 'id'] }]
        });

        // Log activity
        await Activity.create({
            taskId: req.params.id,
            userId: req.user.id,
            type: 'comment',
            description: 'added a comment'
        });

        // Handle @mentions
        const mentionRegex = /@\[([a-zA-Z0-9_ ]+)\]/g;
        const matches = [...content.matchAll(mentionRegex)];

        if (matches.length > 0) {
            const mentionedNames = matches.map(m => m[1].trim());
            // Find users matching the names
            const { Op } = require('sequelize');
            const mentionedUsers = await User.findAll({
                where: {
                    name: { [Op.in]: mentionedNames },
                    id: { [Op.ne]: req.user.id } // Don't notify self
                }
            });

            const task = await Task.findByPk(req.params.id);

            for (const user of mentionedUsers) {
                await Notification.create({
                    userId: user.id,
                    title: 'You were mentioned',
                    message: `${req.user.name} mentioned you in a comment on task: ${task.title}`,
                    type: 'mention',
                    link: `/project/${task.projectId}` // Ideally deep link to task
                });
            }
        }

        res.status(201).json(fullComment);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- Activities ---

// Get activities for a task
router.get('/:id/activities', authMiddleware, async (req, res) => {
    try {
        const activities = await Activity.findAll({
            where: { taskId: req.params.id },
            include: [{ model: User, as: 'actor', attributes: ['name', 'id'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(activities);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- WorkLogs ---

// Get worklogs for a task
router.get('/:id/worklogs', authMiddleware, async (req, res) => {
    try {
        const worklogs = await WorkLog.findAll({
            where: { taskId: req.params.id },
            include: [{ model: User, as: 'author', attributes: ['name', 'id'] }],
            order: [['startedAt', 'DESC']]
        });
        res.json(worklogs);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Add worklog
router.post('/:id/worklogs', authMiddleware, async (req, res) => {
    try {
        const { timeSpent, startedAt, description } = req.body; // timeSpent in minutes
        const taskId = req.params.id;
        const task = await Task.findByPk(taskId);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const worklog = await WorkLog.create({
            taskId,
            userId: req.user.id,
            timeSpent,
            startedAt: startedAt || new Date(),
            description
        });

        // Update task time tracking
        const oldTimeSpent = task.timeSpent || 0;
        const newTimeSpent = oldTimeSpent + Number(timeSpent);

        let newRemaining = task.remainingEstimate;
        // If remainingEstimate is not null, reduce it
        if (newRemaining !== null && newRemaining !== undefined) {
            newRemaining = Math.max(0, newRemaining - Number(timeSpent));
        }

        await task.update({
            timeSpent: newTimeSpent,
            remainingEstimate: newRemaining
        });

        // Log activity
        await Activity.create({
            taskId,
            userId: req.user.id,
            type: 'worklog',
            description: `logged ${timeSpent}m of work`
        });

        // Return full worklog with author
        const fullWorkLog = await WorkLog.findByPk(worklog.id, {
            include: [{ model: User, as: 'author', attributes: ['name', 'id'] }]
        });

        res.status(201).json(fullWorkLog);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Start Timer
router.post('/:id/timer/start', authMiddleware, async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        if (task.timerStartTime) {
            return res.status(400).json({ message: 'Timer is already running for this task' });
        }

        await task.update({ timerStartTime: new Date() });
        res.json({ success: true, message: 'Timer started', timerStartTime: task.timerStartTime });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Stop Timer
router.post('/:id/timer/stop', authMiddleware, async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        let durationMinutes = 0;
        let startTime = new Date();

        // 1. Server-side calculation (Source of Truth)
        if (task.timerStartTime) {
            const start = new Date(task.timerStartTime);
            const end = new Date();
            const durationMs = end - start;
            // Round up to nearest minute to ensure at least 1 min logged if > 0ms
            durationMinutes = Math.ceil(durationMs / 60000);
            startTime = start;
        }
        // 2. Fallback: Client-provided duration (Only if server has no record, e.g. legacy/error case)
        else if (req.body.timeSpent !== undefined && req.body.timeSpent !== null) {
            durationMinutes = Number(req.body.timeSpent);
            startTime = new Date(new Date().getTime() - durationMinutes * 60000);
        } else {
            return res.status(400).json({ message: 'No active timer found.' });
        }

        if (durationMinutes > 0) {
            // Log Worklog
            await WorkLog.create({
                taskId: task.id,
                userId: req.user.id,
                timeSpent: durationMinutes,
                startedAt: startTime,
                description: 'Auto-logged from timer'
            });

            // Update Task totals
            const newTimeSpent = (task.timeSpent || 0) + durationMinutes;

            let newRemaining = task.remainingEstimate;
            if (newRemaining !== null && newRemaining !== undefined) {
                newRemaining = Math.max(0, newRemaining - durationMinutes);
            }

            // Reset timer start time (even if it wasn't running, safe to set null)
            await task.update({
                timeSpent: newTimeSpent,
                remainingEstimate: newRemaining,
                timerStartTime: null
            });

            // Log Activity
            await Activity.create({
                taskId: task.id,
                userId: req.user.id,
                type: 'worklog',
                description: `stopped timer. logged ${durationMinutes}m`
            });

            res.json({
                success: true,
                message: 'Timer stopped',
                timeLogged: durationMinutes,
                taskId: task.id,
                timeSpent: newTimeSpent,
                remainingEstimate: newRemaining
            });
        } else {
            // 0 minutes logged
            if (task.timerStartTime) {
                await task.update({ timerStartTime: null });
            }
            res.json({
                success: true,
                message: 'Timer stopped (0 time logged)',
                timeLogged: 0,
                taskId: task.id,
                timeSpent: task.timeSpent,
                remainingEstimate: task.remainingEstimate
            });
        }
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Delete worklog
router.delete('/:taskId/worklogs/:worklogId', authMiddleware, async (req, res) => {
    try {
        const { taskId, worklogId } = req.params;
        const worklog = await WorkLog.findOne({ where: { id: worklogId, taskId } });
        if (!worklog) return res.status(404).json({ message: 'Worklog not found' });

        const timeToRemove = worklog.timeSpent;
        await worklog.destroy();

        // Update task
        const task = await Task.findByPk(taskId);
        if (task) {
            const newTimeSpent = Math.max(0, (task.timeSpent || 0) - timeToRemove);
            const newRemaining = (task.remainingEstimate || 0) + timeToRemove; // Simple revert approach

            await task.update({
                timeSpent: newTimeSpent,
                remainingEstimate: newRemaining
            });
        }
        res.json({ success: true });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Get subtasks for a task
router.get('/:id/subtasks', authMiddleware, async (req, res) => {
    try {
        const subtasks = await Task.findAll({
            where: { parentTaskId: req.params.id },
            include: [
                { model: User, as: 'assignee', attributes: ['name', 'id'] },
                { model: User, as: 'reporter', attributes: ['name', 'id'] }
            ],
            order: [['createdAt', 'ASC']]
        });
        res.json(subtasks);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- Issue Links ---

// Get links for a task
router.get('/:id/links', authMiddleware, async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const links = task.issueLinks || [];
        if (links.length === 0) return res.json([]);

        const linkedTaskIds = links.map(l => l.linkedTaskId);
        const linkedTasks = await Task.findAll({
            where: { id: linkedTaskIds },
            attributes: ['id', 'title', 'status', 'priority', 'issueType']
        });

        // Merge info
        const result = links.map(link => {
            const t = linkedTasks.find(lt => lt.id === link.linkedTaskId);
            return {
                ...link,
                task: t || null
            };
        });

        res.json(result);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Add a link
router.post('/:id/links', authMiddleware, async (req, res) => {
    try {
        const { type, linkedTaskId } = req.body; // type: "Blocks", "Relates to"
        const task = await Task.findByPk(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        if (Number(linkedTaskId) === Number(req.params.id)) {
            return res.status(400).json({ message: 'Cannot link task to itself' });
        }

        // Validation: linked task exists?
        const targetTask = await Task.findByPk(linkedTaskId);
        if (!targetTask) return res.status(404).json({ message: 'Target task not found' });

        // Update current task links
        let links = task.issueLinks || [];
        // Check duplicate
        const exists = links.find(l => l.linkedTaskId == linkedTaskId && l.type === type);
        if (exists) return res.status(400).json({ message: 'Link already exists' });

        const newLinks = [...links, { type, linkedTaskId: Number(linkedTaskId) }];
        await task.update({ issueLinks: newLinks });

        // OPTIONAL: Create reciprocal link on target task? 
        // For simplicity, we only add one way for now unless requested otherwise.

        res.json(newLinks);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Remove a link
router.delete('/:id/links/:linkedTaskId', authMiddleware, async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        let links = task.issueLinks || [];
        const targetId = Number(req.params.linkedTaskId);
        links = links.filter(l => l.linkedTaskId !== targetId);

        await task.update({ issueLinks: links });
        res.json(links);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- Attachments ---

// Get attachments
router.get('/:id/attachments', authMiddleware, async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });
        res.json(task.attachments || []);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Add attachment (Metadata only, or simple URL if handled by frontend)
router.post('/:id/attachments', authMiddleware, async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const newFiles = req.body; // Expecting object or array of objects
        // { name, size, type, url }
        let attachments = task.attachments || [];

        if (Array.isArray(newFiles)) {
            attachments = [...attachments, ...newFiles];
        } else {
            attachments.push(newFiles);
        }

        await task.update({ attachments });
        res.json(attachments);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Remove attachment
router.delete('/:id/attachments/:fileName', authMiddleware, async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        let attachments = task.attachments || [];
        const fileName = req.params.fileName;

        // Remove attachment by name (assuming unique names for simplicity)
        attachments = attachments.filter(a => a.name !== fileName);

        await task.update({ attachments });
        res.json(attachments);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- Watchers ---

// Toggle Watch
router.post('/:id/watch', authMiddleware, async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        let watchers = task.watchers || [];
        const userId = req.user.id;
        const isWatching = watchers.includes(userId);

        if (isWatching) {
            watchers = watchers.filter(id => id !== userId);
        } else {
            watchers.push(userId);
        }

        await task.update({ watchers });

        if (!isWatching) {
            // Log Activity for watching?
            // Maybe not needed for watching, but user might want to know.
        }

        res.json({ watching: !isWatching, watchers });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

module.exports = router;