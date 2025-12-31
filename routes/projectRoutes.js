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


// Get dashboard stats
router.get('/dashboard-stats', authMiddleware, async (req, res) => {
    try {
        const totalProjects = await Project.count();
        const activeTasks = await Task.count({ where: { status: ['Todo', 'In Progress'] } });
        const completedTasks = await Task.count({ where: { status: 'Done' } });

        res.json({
            totalProjects,
            activeTasks,
            completedTasks
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

router.get('/', authMiddleware, async (req, res) => {
    try {
        const projects = await Project.findAll({
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
        res.json(tasks);
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
        const pm = await ProjectMember.findOrCreate({ where: { projectId: req.params.projectId, userId } });
        res.status(201).json(pm[0]);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Remove a member
router.delete('/:projectId/members/:userId', authMiddleware, async (req, res) => {
    try {
        await ProjectMember.destroy({ where: { projectId: req.params.projectId, userId: req.params.userId } });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

module.exports = router;