// fetch-data.js
const { User, Project, Task } = require('./models/index');

const fetchData = async () => {
    try {
        // 1. Fetch All Users
        const users = await User.findAll();
        console.log('--- USERS ---');
        console.log(JSON.stringify(users, null, 2)); // Pretty print

        // 2. Fetch All Projects
        const projects = await Project.findAll();
        console.log('\n--- PROJECTS ---');
        console.log(JSON.stringify(projects, null, 2));

        // 3. Fetch All Tasks
        const tasks = await Task.findAll();
        console.log('\n--- TASKS ---');
        console.log(JSON.stringify(tasks, null, 2));

        return { users, projects, tasks };

    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
};

module.exports = fetchData;

// Run when executed directly (script)
if (require.main === module) {
    fetchData().catch(() => process.exit(1));
}