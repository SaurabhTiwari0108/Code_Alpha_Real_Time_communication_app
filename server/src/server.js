"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const fileRoutes_1 = __importDefault(require("./routes/fileRoutes"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Connect to MongoDB
mongoose_1.default.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/meetsync')
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('MongoDB connection error:', err));
// Security & Middleware
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: false, // allow serving static files across domains (e.g., uploads)
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api/', limiter);
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production' ? ['https://your-production-url.com'] : '*',
    credentials: true
}));
app.use(express_1.default.json({ limit: '10kb' })); // limit body size
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../../uploads'))); // Serve uploaded files statically
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/files', fileRoutes_1.default);
// Basic Route (API Health)
app.get('/api', (req, res) => {
    res.send('MeetSync API is running');
});
// Serve frontend static files
const clientBuildPath = path_1.default.join(__dirname, '../../client/dist');
app.use(express_1.default.static(clientBuildPath));
// Catch-all route to serve React app for non-API routes
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(clientBuildPath, 'index.html'));
});
// Create HTTP or HTTPS server
let server;
const useHttps = process.env.USE_HTTPS === 'true';
if (useHttps) {
    try {
        const key = fs_1.default.readFileSync(path_1.default.join(__dirname, '../cert/key.pem'));
        const cert = fs_1.default.readFileSync(path_1.default.join(__dirname, '../cert/cert.pem'));
        server = https_1.default.createServer({ key, cert }, app);
        console.log('Running HTTPS server');
    }
    catch (err) {
        console.error('HTTPS certs not found, falling back to HTTP', err);
        server = http_1.default.createServer(app);
    }
}
else {
    server = http_1.default.createServer(app);
}
const socketManager_1 = require("./sockets/socketManager");
// ... other imports
// Socket.io
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
(0, socketManager_1.socketManager)(io);
// Start Server
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
//# sourceMappingURL=server.js.map