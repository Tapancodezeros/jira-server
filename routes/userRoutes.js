const express = require('express');
const router = express.Router();
const { User, Activity, Task } = require('../models/index');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const authMiddleware = require('../middleware/authMiddleware');

// Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const userExists = await User.findOne({ where: { email } });
        if (userExists) return res.status(400).json({ message: 'User exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = await User.create({ name, email, password: hashedPassword });

        const { JWT_SECRET } = require('../config/auth');
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
        res.status(201).json({ id: user.id, name: user.name, email: user.email, token });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });

        if (user && (await bcrypt.compare(password, user.password))) {
            const { JWT_SECRET } = require('../config/auth');
            const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
            res.json({ id: user.id, name: user.name, email: user.email, token });
        } else { res.status(401).json({ message: 'Invalid credentials' }); }
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Update Profile
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { name, currentPassword, newPassword } = req.body;
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Update basic info
        if (name) user.name = name;

        // Update password if provided
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ message: 'Current password is required to set a new password' });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Incorrect current password' });
            }
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        await user.save();

        // Return updated user info (excluding password)
        res.json({ id: user.id, name: user.name, email: user.email });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get User Activity
router.get('/activity', authMiddleware, async (req, res) => {
    try {
        const activities = await Activity.findAll({
            where: { userId: req.user.id },
            include: [{ model: Task, attributes: ['id', 'title'] }],
            order: [['createdAt', 'DESC']],
            limit: 10
        });
        res.json(activities);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get All Users (For Dropdowns)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const users = await User.findAll({ attributes: ['id', 'name', 'email'] });
        res.json(users);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

module.exports = router;