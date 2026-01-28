const { sequelize, Task, User, Project } = require('./models');

async function test() {
    try {
        await sequelize.authenticate();
        console.log('Connected');

        // find a user and project
        const user = await User.findOne();
        const project = await Project.findOne();

        if (!user || !project) {
            console.log('No user or project found to test task creation');
            return;
        }

        console.log(`Using User: ${user.id}, Project: ${project.id}`);

        const task = await Task.create({
            title: 'Test Task ' + Date.now(),
            description: 'Test Description',
            projectId: project.id,
            reporterId: user.id,
            status: 'Todo',
            priority: 'Medium',
            issueType: 'Task',
            attachments: [],
            issueLinks: [],
            watchers: []
        });

        console.log('Task Created:', task.toJSON());

        // Test fetching
        const fetched = await Task.findByPk(task.id);
        console.log('Task Fetched:', fetched ? 'Found' : 'Not Found');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

test();
