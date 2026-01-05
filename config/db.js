const { Sequelize } = require('sequelize');
require('dotenv').config();

// Logic: Check if we have a live DATABASE_URL (Production)
// If not, fall back to local variables (Development)
const sequelize = process.env.DATABASE_URL
    ? new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false, // Critical for Render's free tier to work
            },
        },
        logging: false,
    })
    : new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASSWORD,
        {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            dialect: 'postgres',
            logging: false,
        }
    );

module.exports = sequelize;