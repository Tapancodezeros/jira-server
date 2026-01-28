const express = require('express');
const router = express.Router();
const { Project, User, Task, ProjectMember, sequelize } = require('../models/index');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, description, teamLeaderId, template } = req.body;
        const project = await Project.create({
            name, description, template, ownerId: req.user.id, teamLeaderId: teamLeaderId || null
        });
        // add owner as a member
        await ProjectMember.create({ projectId: project.id, userId: req.user.id });
        // optionally add team leader as a member
        if (teamLeaderId) await ProjectMember.findOrCreate({ where: { projectId: project.id, userId: teamLeaderId } });
        res.status(201).json(project);
    } catch (error) { res.status(500).json({ message: error.message }); }
});


// Get dashboard stats (Personalized)
router.get('/dashboard-stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Count projects where user is a member
        const totalProjects = await ProjectMember.count({ where: { userId } });

        // Count active tasks assigned to user
        const activeTasks = await Task.count({
            where: {
                assigneeId: userId,
                status: ['Todo', 'In Progress']
            }
        });

        // Count completed tasks assigned to user
        const completedTasks = await Task.count({
            where: {
                assigneeId: userId,
                status: 'Done'
            }
        });

        res.json({
            totalProjects,
            activeTasks,
            completedTasks
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Get all projects (Admin/Overview)
router.get('/all', authMiddleware, async (req, res) => {
    try {
        const projects = await Project.findAll({
            include: [
                { model: User, as: 'teamLeader', attributes: ['name', 'id'] },
                { model: User, as: 'owner', attributes: ['name', 'id'] },
                { model: User, as: 'members', attributes: ['id', 'name'] } // Include members to check count if needed
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(projects);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

router.get('/', authMiddleware, async (req, res) => {
    try {
        // Get projects for logged in user
        const memberProjects = await ProjectMember.findAll({ where: { userId: req.user.id }, attributes: ['projectId'] });
        const projectIds = memberProjects.map(pm => pm.projectId);

        const projects = await Project.findAll({
            where: { id: projectIds },
            include: [
                { model: User, as: 'teamLeader', attributes: ['name', 'id'] },
                { model: User, as: 'owner', attributes: ['name', 'id'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(projects);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Get single project
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const project = await Project.findByPk(req.params.id, {
            include: [
                { model: User, as: 'teamLeader', attributes: ['name', 'id'] },
                { model: User, as: 'owner', attributes: ['name', 'id'] }
            ]
        });
        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.json(project);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Update project
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const project = await Project.findByPk(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        // Only owner or team leader (or admin) should technically update, but for now allow logged in user to edit if they have access?
        // Let's assume we check simple permission or just allow for this demo
        const { name, description, teamLeaderId } = req.body;
        await project.update({
            name, description, teamLeaderId
        });

        // If team leader changed, ensure they are a member? 
        if (teamLeaderId && teamLeaderId !== project.teamLeaderId) {
            await ProjectMember.findOrCreate({ where: { projectId: project.id, userId: teamLeaderId } });
        }

        res.json(project);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Delete project
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const project = await Project.findByPk(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        // Only owner should delete?
        if (project.ownerId !== req.user.id) {
            return res.status(403).json({ message: 'Only the project owner can delete this project' });
        }

        await project.destroy();
        res.json({ success: true, message: 'Project deleted' });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Get project statistics
router.get('/:id/stats', authMiddleware, async (req, res) => {
    try {
        const stats = await Task.findAll({
            where: { projectId: req.params.id },
            attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['status']
        });
        res.json(stats);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Get deleted tasks (trash)
router.get('/:id/trash', authMiddleware, async (req, res) => {
    try {
        const { Op } = require('sequelize');
        console.log(`Checking trash for project ${req.params.id}`);
        const tasks = await Task.findAll({
            where: {
                projectId: req.params.id,
                deletedAt: { [Op.not]: null }
            },
            paranoid: false,
            include: [
                { model: User, as: 'assignee', attributes: ['name', 'id'] }
            ],
            order: [['deletedAt', 'DESC']]
        });
        console.log(`Found ${tasks.length} tasks in trash.`);
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching trash:', error);
        res.status(500).json({ message: error.message });
    }
});

// Empty Trash (Permanently delete all soft-deleted tasks for a project)
router.delete('/:id/trash', authMiddleware, async (req, res) => {
    try {
        const { Op } = require('sequelize');
        const count = await Task.count({
            where: {
                projectId: req.params.id,
                deletedAt: { [Op.not]: null }
            },
            paranoid: false
        });

        if (count > 0) {
            await Task.destroy({
                where: {
                    projectId: req.params.id,
                    deletedAt: { [Op.not]: null }
                },
                force: true // Permanent Delete
            });
        }
        res.json({ success: true, message: `Trash emptied. ${count} tasks permanently deleted.` });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Get members for a project
router.get('/:projectId/members', authMiddleware, async (req, res) => {
    try {
        const members = await ProjectMember.findAll({ where: { projectId: req.params.projectId } });
        const userIds = members.map(m => m.userId);
        const users = await User.findAll({ where: { id: userIds }, attributes: ['id', 'name', 'email'] });
        res.json(users);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Add a member to a project
router.post('/:projectId/members', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.body;

        // Check if user is already a member
        const existingMember = await ProjectMember.findOne({ where: { projectId: req.params.projectId, userId } });
        if (existingMember) {
            return res.status(200).json(existingMember);
        }

        // Check member limit
        const memberCount = await ProjectMember.count({ where: { projectId: req.params.projectId } });
        if (memberCount >= 8) {
            return res.status(400).json({ message: 'Selection limit is 8 people' });
        }

        const pm = await ProjectMember.create({ projectId: req.params.projectId, userId });
        res.status(201).json(pm);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Remove a member
router.delete('/:projectId/members/:userId', authMiddleware, async (req, res) => {
    try {
        await ProjectMember.destroy({ where: { projectId: req.params.projectId, userId: req.params.userId } });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Get comprehensive project reports
router.get('/:id/reports', authMiddleware, async (req, res) => {
    try {
        const { Op } = require('sequelize');
        const projectId = req.params.id;

        // 1. Status Distribution
        const statusCounts = await Task.findAll({
            where: { projectId },
            attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['status']
        });

        // 2. Priority Breakdown (Open Issues only: not Done)
        const priorityCounts = await Task.findAll({
            where: {
                projectId,
                status: { [Op.ne]: 'Done' }
            },
            attributes: ['priority', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['priority']
        });

        // 3. Team Workload (Active tasks: not Done)
        const workload = await Task.findAll({
            where: {
                projectId,
                assigneeId: { [Op.ne]: null },
                status: { [Op.ne]: 'Done' }
            },
            attributes: ['assigneeId', [sequelize.fn('COUNT', sequelize.col('Task.id')), 'count']],
            include: [{ model: User, as: 'assignee', attributes: ['name', 'id'] }],
            group: ['assigneeId', 'assignee.id', 'assignee.name']
        });

        // 4. KPI Calculations
        const totalTasks = await Task.count({ where: { projectId } });
        const completedTasks = await Task.count({ where: { projectId, status: 'Done' } });
        const unassignedTasks = await Task.count({ where: { projectId, assigneeId: null } });
        const highPriorityTasks = await Task.count({
            where: {
                projectId,
                priority: { [Op.in]: ['High', 'Critical'] },
                status: { [Op.ne]: 'Done' }
            }
        });

        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Format chart data helper
        const formatDistribution = (data, key) => {
            const map = {};
            data.forEach(item => {
                map[item[key]] = Number(item.getDataValue('count'));
            });
            return map;
        };

        const formatWorkload = (data) => {
            return data.map(item => ({
                name: item.assignee ? item.assignee.name : 'Unknown',
                count: Number(item.getDataValue('count')),
                assigneeId: item.assigneeId
            }));
        };

        res.json({
            kpi: {
                totalTasks,
                completedRate: completionRate,
                highPriorityCount: highPriorityTasks,
                unassignedCount: unassignedTasks
            },
            distribution: {
                status: formatDistribution(statusCounts, 'status'),
                priority: formatDistribution(priorityCounts, 'priority'),
                workload: formatWorkload(workload)
            }
        });

    } catch (error) {
        console.error('Reports Error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;