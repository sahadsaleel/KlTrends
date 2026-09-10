import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import managerRoutes from './routes/managerRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import packagingRoutes from './routes/packagingRoutes.js';

import { errorHandler } from './middleware/errorHandler.js';

const app: Application = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
    origin: (origin, callback) => {
        // Mobile apps, curl, Postman, server-to-server requests have no origin header
        if (!origin) return callback(null, true);
        // If ALLOWED_ORIGINS is not set or contains *, allow all origins
        if (allowedOrigins.length === 0 || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({
        limit: '100kb',
    extended: true,
}));

const authLimiter = rateLimit({
    windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    limit: Number(process.env.AUTH_RATE_LIMIT_MAX || 100),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, error: 'Too many authentication requests. Please try again later.' },
});
const otpLimiter = rateLimit({
    windowMs: Number(process.env.OTP_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000),
    limit: Number(process.env.OTP_RATE_LIMIT_MAX || 10),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, error: 'Too many verification requests. Please try again later.' },
});

app.use('/api', healthRoutes);
app.use('/api/auth/send-otp', otpLimiter);
app.use('/api/auth/verify-otp', otpLimiter);
app.use('/api/auth/verify-reset-otp', otpLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/packaging', packagingRoutes);

app.use(errorHandler);

export default app;