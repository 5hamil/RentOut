import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';
import { xssSanitizer } from './middleware/sanitize';
import { csrfProtection, generateCsrfToken } from './middleware/csrf';

import authRouter from './routes/auth';
import listingsRouter from './routes/listings';
import bookingsRouter from './routes/bookings';
import messagesRouter from './routes/messages';
import reviewsRouter from './routes/reviews';
import reportsRouter from './routes/reports';
import verificationsRouter from './routes/verifications';
import adminRouter from './routes/admin';
import disputesRouter from './routes/disputes';

dotenv.config();

const app = express();
app.use(helmet());
const server = http.createServer(app);

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

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin '${origin}' is not allowed.`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  credentials: true, // Required for cookies (refresh token)
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Pre-flight for all routes

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(xssSanitizer);
app.use(csrfProtection);

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/csrf-token', generateCsrfToken);

app.use('/api/auth', authRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/verifications', verificationsRouter);
app.use('/api/admin', adminRouter);
app.use('/api', disputesRouter);

app.use(errorHandler);

// ─────────────────────────────────────────────────────────────────────────────
// SOCKET.IO  (real-time chat)
// ─────────────────────────────────────────────────────────────────────────────

export const io = new Server(server, {
  cors: corsOptions,
});

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('join_booking_room', (bookingId: string) => {
    socket.join(`booking:${bookingId}`);
    console.log(`Socket ${socket.id} joined booking:${bookingId}`);
  });

  socket.on('send_message', (data: { bookingId: string; content: string; senderId: string }) => {
    io.to(`booking:${data.bookingId}`).emit('receive_message', data);
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
  console.log(`\n🚀 RentOut API running on port ${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}\n`);
});
