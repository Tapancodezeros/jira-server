const { sequelize, User, Project, Task, ProjectMember, Notification, Comment, Activity } = require('./models');
const bcrypt = require('bcryptjs');

const runSeed = async () => {
    try {
        console.log('Syncing database...');
        // alter: true updates the schema to match the models without deleting data
        await sequelize.sync({ alter: true });

        console.log('Seeding Users...');
        const users = [];
        const passwordHash = await bcrypt.hash('password123', 10);

        for (let i = 1; i <= 50; i++) {
            users.push({
                name: `User ${Date.now()}_${i}`,
                email: `user${Date.now()}_${i}@example.com`,
                password: passwordHash
            });
        }
        const createdUsers = await User.bulkCreate(users);
        console.log(`Created ${createdUsers.length} Users`);
        const userIds = createdUsers.map(u => u.id);

        console.log('Seeding Projects...');
        const projects = [];
        for (let i = 1; i <= 50; i++) {
            projects.push({
                name: `Project ${i} - ${Date.now()}`,
                description: `Description for project ${i}`,
                ownerId: userIds[Math.floor(Math.random() * userIds.length)],
                teamLeaderId: userIds[Math.floor(Math.random() * userIds.length)]
            });
        }
        const createdProjects = await Project.bulkCreate(projects);
        console.log(`Created ${createdProjects.length} Projects`);

        console.log('Seeding ProjectMembers...');
        const members = [];
        for (const project of createdProjects) {
            // Add 1-3 random members to each project
            const count = Math.floor(Math.random() * 3) + 1;
            const memberIds = [];
            for (let j = 0; j < count; j++) {
                const uid = userIds[Math.floor(Math.random() * userIds.length)];
                if (!memberIds.includes(uid)) {
                    memberIds.push(uid);
                    members.push({
                        projectId: project.id,
                        userId: uid
                    });
                }
            }
        }
        await ProjectMember.bulkCreate(members);
        console.log(`Created ${members.length} ProjectMembers`);

        console.log('Seeding Tasks...');
        const tasks = [];
        for (let i = 1; i <= 50; i++) {
            const project = createdProjects[Math.floor(Math.random() * createdProjects.length)];
            tasks.push({
                title: `Task ${i} - ${Date.now()}`,
                description: `Description for task ${i}`,
                status: ['Todo', 'In Progress', 'Done'][Math.floor(Math.random() * 3)],
                priority: ['Low', 'Medium', 'High', 'Critical'][Math.floor(Math.random() * 4)],
                projectId: project.id,
                assigneeId: userIds[Math.floor(Math.random() * userIds.length)],
                reporterId: userIds[Math.floor(Math.random() * userIds.length)],
                dueDate: new Date(Date.now() + Math.random() * 10000000000),
                issueType: ['Story', 'Task', 'Bug', 'Epic'][Math.floor(Math.random() * 4)],
                storyPoints: Math.floor(Math.random() * 10) + 1
            });
        }
        const createdTasks = await Task.bulkCreate(tasks);
        console.log(`Created ${createdTasks.length} Main Tasks`);

        // Create 50 Subtasks
        const subtasks = [];
        for (let i = 1; i <= 50; i++) {
            const parent = createdTasks[Math.floor(Math.random() * createdTasks.length)];
            const project = createdProjects.find(p => p.id === parent.projectId);
            subtasks.push({
                title: `Subtask ${i} of Task ${parent.id}`,
                description: `Subtask details...`,
                status: ['Todo', 'In Progress', 'Done'][Math.floor(Math.random() * 3)],
                priority: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
                projectId: parent.projectId,
                parentTaskId: parent.id,
                assigneeId: userIds[Math.floor(Math.random() * userIds.length)],
                reporterId: userIds[Math.floor(Math.random() * userIds.length)],
                issueType: 'Task'
            });
        }
        const createdSubtasks = await Task.bulkCreate(subtasks);
        console.log(`Created ${createdSubtasks.length} Subtasks`);

        const allTasks = [...createdTasks, ...createdSubtasks];

        console.log('Seeding Comments...');
        const comments = [];
        for (let i = 0; i < 50; i++) {
            comments.push({
                content: `This is comment #${i} with some useful info.`,
                userId: userIds[Math.floor(Math.random() * userIds.length)],
                taskId: allTasks[Math.floor(Math.random() * allTasks.length)].id
            });
        }
        await Comment.bulkCreate(comments);
        console.log(`Created ${comments.length} Comments`);

        console.log('Seeding Activities...');
        const activities = [];
        for (let i = 0; i < 50; i++) {
            activities.push({
                userId: userIds[Math.floor(Math.random() * userIds.length)],
                taskId: allTasks[Math.floor(Math.random() * allTasks.length)].id,
                type: ['status', 'priority', 'assignee', 'create'][Math.floor(Math.random() * 4)],
                description: `Activity description ${i}`
            });
        }
        await Activity.bulkCreate(activities);
        console.log(`Created ${activities.length} Activities`);

        console.log('Seeding Notifications...');
        const notifications = [];
        for (let i = 0; i < 50; i++) {
            notifications.push({
                userId: userIds[Math.floor(Math.random() * userIds.length)],
                title: `Notification ${i}`,
                message: `Something happened ${i}`,
                type: ['info', 'success', 'warning', 'error'][Math.floor(Math.random() * 4)],
                link: `/tasks/${allTasks[Math.floor(Math.random() * allTasks.length)].id}`
            });
        }
        await Notification.bulkCreate(notifications);
        console.log(`Created ${notifications.length} Notifications`);

        console.log('Seeding complete!');
        process.exit(0);

    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
};

runSeed();
