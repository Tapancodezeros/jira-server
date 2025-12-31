const express = require('express');
const router = express.Router();
const { Notification } = require('../models/index');
const authMiddleware = require('../middleware/authMiddleware');

// Get all notifications for current user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const notifications = await Notification.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mark all as read
router.put('/read-all', authMiddleware, async (req, res) => {
    try {
        await Notification.update({ read: true }, {
            where: { userId: req.user.id, read: false }
        });
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mark as read
router.put('/:id/read', authMiddleware, async (req, res) => {
    try {
        const notif = await Notification.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });
        if (!notif) return res.status(404).json({ message: 'Notification not found' });

        notif.read = true;
        await notif.save();
        res.json(notif);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete notification
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const deleted = await Notification.destroy({
            where: { id: req.params.id, userId: req.user.id }
        });
        if (!deleted) return res.status(404).json({ message: 'Notification not found' });
        res.json({ message: 'Notification deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
