const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { sequelize } = require('./models/index');

dotenv.config();
const app = express();

// --- CORS CONFIGURATION (Updated) ---
app.use(cors({
  origin: [
    "https://jira-clone-eight-saqe.vercel.app", // Your Live Vercel Frontend
    "http://localhost:5173",                    // Your Local Vite Frontend
    "http://localhost:3000"                     // Your Local React Frontend
  ],
  credentials: true, // REQUIRED: Allows cookies/headers to be sent safely
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
// ------------------------------------

app.use(express.json());

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Simple health-check endpoint
app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await sequelize.authenticate();
    // alter: true updates tables if you change models, without deleting data
    await sequelize.sync({ alter: true }); 
    console.log('✅ Database Connected and Synced');
  } catch (err) {
    console.error('❌ DB Error:', err);
  }
});