import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { prisma } from './config/database';

dotenv.config();

const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missing = requiredEnvVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}
import { authRoutes } from './routes/auth.routes';
import { employeeRoutes } from './routes/employee.routes';
import { attendanceRoutes } from './routes/attendance.routes';
import { payslipRoutes } from './routes/payslip.routes';
import { uploadRoutes } from './routes/upload.routes';
import { settingsRoutes } from './routes/settings.routes';
import { auditRoutes } from './routes/audit.routes';
import { emailRoutes } from './routes/email.routes';
import { jibbleRoutes } from './services/jibble/jibble.routes';
import { errorMiddleware } from './middlewares/error.middleware';
import { loggingMiddleware } from './middlewares/logging.middleware';
import { authMiddleware } from './middlewares/auth.middleware';

const app = express();
const PORT = process.env.PORT || 5000;

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error);
});

app.disable('etag');

app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));
app.use(loggingMiddleware);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);

app.use('/api/employees', authMiddleware, employeeRoutes);
app.use('/api/attendance', authMiddleware, attendanceRoutes);
app.use('/api/payslips', authMiddleware, payslipRoutes);
app.use('/api/upload', authMiddleware, uploadRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/audit', authMiddleware, auditRoutes);
app.use('/api/email-logs', authMiddleware, emailRoutes);
app.use('/api/jibble', authMiddleware, jibbleRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use(errorMiddleware);

const server = app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Database: ${process.env.DATABASE_URL}`);
});

const shutdown = async () => {
  console.log('\nShutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
