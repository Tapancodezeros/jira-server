const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { sequelize } = require('./models/index');

dotenv.config();
const app = express();

// --- UPDATED CORS SETTINGS ---
app.use(cors({
    origin: [
        "https://jira-clone-eight-saqe.vercel.app", // Your Vercel Frontend
        "http://localhost:5173",                    // Local Vite
        "http://localhost:3000"                     // Local React
    ],
    credentials: true, // Essential for passing cookies/tokens
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "application/json"]
}));
// -----------------------------

app.use(express.json());

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Health Check
app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true });
        console.log('✅ Database Connected and Synced');
    } catch (err) {
        console.error('❌ DB Error:', err);
    }
});