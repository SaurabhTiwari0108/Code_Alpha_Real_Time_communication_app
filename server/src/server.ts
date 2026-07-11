import express from 'express';
import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import authRoutes from './routes/authRoutes';
import fileRoutes from './routes/fileRoutes';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust the proxy (Render's load balancer) for express-rate-limit
app.set('trust proxy', 1);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/meetsync')
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Security & Middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // allow serving static files across domains (e.g., uploads)
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api/', limiter);

app.use(cors({ 
  origin: process.env.NODE_ENV === 'production' ? ['https://your-production-url.com'] : '*',
  credentials: true
}));
app.use(express.json({ limit: '10kb' })); // limit body size
app.use('/uploads', express.static(path.join(__dirname, '../../uploads'))); // Serve uploaded files statically

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);

// Basic Route (API Health)
app.get('/api', (req, res) => {
  res.send('MeetSync API is running');
});

// Serve frontend static files
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

// Catch-all route to serve React app for non-API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Create HTTP or HTTPS server
let server;

const useHttps = process.env.USE_HTTPS === 'true';

if (useHttps) {
  try {
    const key = fs.readFileSync(path.join(__dirname, '../cert/key.pem'));
    const cert = fs.readFileSync(path.join(__dirname, '../cert/cert.pem'));
    server = https.createServer({ key, cert }, app);
    console.log('Running HTTPS server');
  } catch (err) {
    console.error('HTTPS certs not found, falling back to HTTP', err);
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
}

import { socketManager } from './sockets/socketManager';

// ... other imports

// Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

socketManager(io);

// Start Server
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
