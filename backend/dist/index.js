"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const errorHandler_1 = require("./middleware/errorHandler");
const sanitize_1 = require("./middleware/sanitize");
const csrf_1 = require("./middleware/csrf");
const auth_1 = __importDefault(require("./routes/auth"));
const listings_1 = __importDefault(require("./routes/listings"));
const bookings_1 = __importDefault(require("./routes/bookings"));
const messages_1 = __importDefault(require("./routes/messages"));
const reviews_1 = __importDefault(require("./routes/reviews"));
const reports_1 = __importDefault(require("./routes/reports"));
const verifications_1 = __importDefault(require("./routes/verifications"));
const admin_1 = __importDefault(require("./routes/admin"));
const disputes_1 = __importDefault(require("./routes/disputes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
const server = http_1.default.createServer(app);
// ─────────────────────────────────────────────────────────────────────────────
// CORS
// FRONTEND_URL must be set in .env for local dev and in Railway for production.
// Example values:
//   Local:      http://localhost:3000
//   Production: https://paperrentel.vercel.app
// ─────────────────────────────────────────────────────────────────────────────
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    // Add additional allowed origins here if needed (e.g., staging)
];
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error(`CORS: Origin '${origin}' is not allowed.`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
    credentials: true, // Required for cookies (refresh token)
};
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions)); // Pre-flight for all routes
// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.use(sanitize_1.xssSanitizer);
app.use(csrf_1.csrfProtection);
// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/csrf-token', csrf_1.generateCsrfToken);
app.use('/api/auth', auth_1.default);
app.use('/api/listings', listings_1.default);
app.use('/api/bookings', bookings_1.default);
app.use('/api/messages', messages_1.default);
app.use('/api/reviews', reviews_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/verifications', verifications_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api', disputes_1.default);
app.use(errorHandler_1.errorHandler);
// ─────────────────────────────────────────────────────────────────────────────
// SOCKET.IO  (real-time chat)
// ─────────────────────────────────────────────────────────────────────────────
exports.io = new socket_io_1.Server(server, {
    cors: corsOptions,
});
exports.io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    socket.on('join_booking_room', (bookingId) => {
        socket.join(`booking:${bookingId}`);
        console.log(`Socket ${socket.id} joined booking:${bookingId}`);
    });
    socket.on('send_message', (data) => {
        exports.io.to(`booking:${data.bookingId}`).emit('receive_message', data);
    });
    socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
    });
});
// ─────────────────────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`\n🚀 PaperRentel API running on port ${PORT}`);
    console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}\n`);
});
