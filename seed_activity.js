const { sequelize, User, Task, Activity } = require('./models/index');
require('dotenv').config();

const seedActivity = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to DB');

        const user = await User.findOne({ where: { email: 'admin@demo.com' } });
        if (!user) {
            console.error('User not found. Run seed.js first.');
            process.exit(1);
        }

        const tasks = await Task.findAll({ limit: 3 });
        if (tasks.length === 0) {
            console.error('No tasks found. Run seed.js first.');
            process.exit(1);
        }

        const activities = [
            {
                userId: user.id,
                taskId: tasks[0].id,
                type: 'create',
                description: 'Created the task',
                createdAt: new Date(Date.now() - 86400000 * 2)
            },
            {
                userId: user.id,
                taskId: tasks[0].id,
                type: 'status',
                description: 'Changed status to Done',
                createdAt: new Date(Date.now() - 86400000)
            },
            {
                userId: user.id,
                taskId: tasks[1].id,
                type: 'update',
                description: 'Updated priority to Critical',
                createdAt: new Date(Date.now() - 43200000)
            },
            {
                userId: user.id,
                taskId: tasks[2].id,
                type: 'comment',
                description: 'Added a comment',
                createdAt: new Date(Date.now() - 3600000)
            }
        ];

        await Activity.bulkCreate(activities);
        console.log('✅ Activities seeded for admin@demo.com');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding Activities Failed:', err);
        process.exit(1);
    }
};

seedActivity();
