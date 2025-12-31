// Small script to ensure `deletedAt` column exists for paranoid models.
// Run: node server/add-deletedAt.js
const sequelize = require('./config/db');

async function ensureDeletedAt() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');

    // Add deletedAt to Tasks table (Postgres). Adjust table name if you customized it.
    await sequelize.query(`ALTER TABLE \\"Tasks\\" ADD COLUMN IF NOT EXISTS \\"deletedAt\\" TIMESTAMP WITH TIME ZONE;`);
    console.log('Ensured Tasks.deletedAt exists');

    // You can add other tables similarly if needed:
    // await sequelize.query(`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;`);
    // await sequelize.query(`ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;`);

  } catch (err) {
    console.error('Error ensuring deletedAt:', err);
  } finally {
    await sequelize.close();
  }
}

ensureDeletedAt();
