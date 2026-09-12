import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRoutes from './routes/chat.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend client communication
app.use(cors());
app.use(express.json());

// Normalize multiple slashes in request URLs (e.g., //api/chat -> /api/chat)
app.use((req, res, next) => {
  req.url = req.url.replace(/\/{2,}/g, '/');
  next();
});

// Routes
app.use('/api', chatRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Road Safety Bot Backend API' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal server error occurred.' });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(`🚦 Road Safety Bot Backend Server running`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`💬 API Endpoint: POST http://localhost:${PORT}/api/chat`);
  console.log(`===========================================`);
});
