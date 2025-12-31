// server/sync-db.js
const sequelize = require('./config/db'); // Points to your config/db.js
const { User, Project, Task, Notification, Comment, Activity } = require('./models/index'); // Imports all models

const syncDatabase = async () => {
  try {
    // 1. Connect to DB
    await sequelize.authenticate();
    console.log('✅ Connection has been established successfully.');

    // 2. Force Sync
    // { force: true } drops existing tables and recreates them. 
    // This FIXES the "null values" error by wiping the bad data.
    await sequelize.sync({ force: true });

    console.log('✅ All tables (User, Project, Task, Notification, Comment, Activity) were RECREATED successfully!');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  } finally {
    // 3. Close connection
    await sequelize.close();
  }
};

syncDatabase();