import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patient.routes';
import opportunityRoutes from './routes/opportunity.routes';
import settingsRoutes from './routes/settings.routes';
import userRoutes from './routes/user.routes';
import clinicalRecordRoutes from './routes/clinical-record.routes';
import notificationRoutes from './routes/notification.routes';
import whatsappRoutes from './routes/whatsapp.routes';
import { generalLimiter } from './middlewares/rateLimiter.middleware';
import logger, { morganStream } from './lib/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security Headers - Helmet.js
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
    },
}));

// CORS Configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));

// HTTP Request Logging
app.use(morgan('combined', { stream: morganStream }));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Rate Limiting
app.use('/api/', generalLimiter);

// Health Check (without rate limiting)
app.get('/health', (req, res) => {
    logger.debug('Health check requested');
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clinical-records', clinicalRecordRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// 404 Handler
app.use((req, res) => {
    logger.warn(`404 - Endpoint not found: ${req.method} ${req.path}`);
    res.status(404).json({
        error: 'Endpoint não encontrado',
        path: req.path,
    });
});

// Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Erro interno do servidor'
            : err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🔒 Security headers enabled`);
    logger.info(`⏱️  Rate limiting active`);
    logger.info(`📝 Structured logging with Winston enabled`);
});
