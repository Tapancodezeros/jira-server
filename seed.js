const { sequelize, User, Project, Task, Notification, Activity, Comment } = require('./models/index');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seed = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to DB');

        // Force sync to clear data
        await sequelize.sync({ force: true });
        console.log('✅ Database Cleared & Synced');

        // 1. Create Users
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('123456', salt);

        const admin = await User.create({ name: 'Admin User', email: 'admin@demo.com', password: passwordHash });
        const john = await User.create({ name: 'John Doe', email: 'john@demo.com', password: passwordHash });
        const jane = await User.create({ name: 'Jane Smith', email: 'jane@demo.com', password: passwordHash });

        console.log('✅ Users Created');
        console.log('   👉 admin@demo.com / 123456');
        console.log('   👉 john@demo.com / 123456');

        // 2. Create Projects
        const p1 = await Project.create({
            name: 'Jira Clone Development',
            description: 'Building a full-stack Jira clone with React and Node.js',
            ownerId: admin.id,
            teamLeaderId: admin.id
        });

        const p2 = await Project.create({
            name: 'Marketing Campaign 2025',
            description: 'Planning Q1 marketing activities and social media strategy',
            ownerId: john.id,
            teamLeaderId: john.id
        });

        console.log('✅ Projects Created');

        // 3. Create Tasks for Project 1
        const tasksData = [
            {
                title: 'Setup Project Structure',
                description: 'Initialize React app and Node server with basic configurations.',
                status: 'Done',
                priority: 'High',
                assigneeId: admin.id,
                reporterId: admin.id,
                projectId: p1.id,
                dueDate: new Date(Date.now() - 86400000 * 2), // 2 days ago
                labels: ['Setup', 'DevOps']
            },
            {
                title: 'Design Database Schema',
                description: 'Create ERD for Users, Projects, and Tasks.',
                status: 'Done',
                priority: 'Critical',
                assigneeId: jane.id,
                reporterId: admin.id,
                projectId: p1.id,
                dueDate: new Date(Date.now() - 86400000), // 1 day ago
                labels: ['Backend', 'Database']
            },
            {
                title: 'Implement Authentication',
                description: 'JWT based auth with login and register endpoints.',
                status: 'In Progress',
                priority: 'Critical',
                assigneeId: john.id,
                reporterId: admin.id,
                projectId: p1.id,
                dueDate: new Date(Date.now() + 86400000 * 2), // in 2 days
                labels: ['Security', 'Backend']
            },
            {
                title: 'Frontend Dashboard UI',
                description: 'Create responsive dashboard layout with sidebar and header.',
                status: 'In Progress',
                priority: 'Medium',
                assigneeId: jane.id,
                reporterId: admin.id,
                projectId: p1.id,
                dueDate: new Date(Date.now() + 86400000 * 5),
                labels: ['Frontend', 'UI/UX']
            },
            {
                title: 'Task Drag and Drop',
                description: 'Implement drag and drop for Kanban board columns.',
                status: 'Todo',
                priority: 'High',
                assigneeId: admin.id,
                reporterId: admin.id,
                projectId: p1.id,
                dueDate: new Date(Date.now() + 86400000 * 10),
                labels: ['Frontend', 'Feature']
            },
            {
                title: 'Fix Login Bug',
                description: 'Users report unable to login with special characters in password.',
                status: 'Todo',
                priority: 'Critical',
                assigneeId: john.id,
                reporterId: jane.id,
                projectId: p1.id,
                dueDate: new Date(),
                labels: ['Bug', 'Urgent']
            }
        ];

        for (const t of tasksData) {
            await Task.create(t);
        }

        // 4. Create Tasks for Project 2
        await Task.create({
            title: 'Content Strategy',
            description: 'Draft blog posts for the next month.',
            status: 'In Progress',
            priority: 'Medium',
            assigneeId: john.id,
            reporterId: john.id,
            projectId: p2.id,
            dueDate: new Date(Date.now() + 86400000 * 3),
            labels: ['Content']
        });

        await Task.create({
            title: 'Social Media Assets',
            description: 'Create banners for Twitter and LinkedIn.',
            status: 'Todo',
            priority: 'Low',
            assigneeId: jane.id,
            reporterId: john.id,
            projectId: p2.id,
            dueDate: new Date(Date.now() + 86400000 * 7),
            labels: ['Design']
        });

        console.log('✅ Tasks Created');

        console.log('---------------------------------');
        console.log('SEEDING COMPLETE');
        console.log('---------------------------------');
        console.log('Use these credentials to login:');
        console.log('Email:    admin@demo.com');
        console.log('Password: 123456');
        console.log('---------------------------------');

        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding Failed:', err);
        process.exit(1);
    }
};

seed();
