// IMPORTANTE: dotenv.config() DEVE ser o primeiro comando
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patient.routes';
import opportunityRoutes from './routes/opportunity.routes.simple'; // TEMP: usando versão simplificada
import settingsRoutes from './routes/settings.routes';
import userRoutes from './routes/user.routes';
import clinicalRecordRoutes from './routes/clinical-record.routes';
import notificationRoutes from './routes/notification.routes';
import whatsappRoutes from './routes/whatsapp.routes.simple'; // TEMP: usando versão simplificada
import { generalLimiter } from './middlewares/rateLimiter.middleware';
import logger, { morganStream } from './lib/logger';
import notificationService from './services/notification.service';
import { sentryService } from './lib/sentry';

const app = express();
const PORT = process.env.PORT || 3001;

// Inicializar Sentry (deve ser antes de qualquer middleware)
sentryService.initialize(app);

// Sentry request handler (deve ser o primeiro middleware)
app.use(sentryService.requestHandler());

// Sentry tracing handler
app.use(sentryService.tracingHandler());

const app = express();
const PORT = process.env.PORT || 3001;

// Criar servidor HTTP (necessário para Socket.io)
const httpServer = createServer(app);

// Inicializar Socket.io
notificationService.initializeSocket(httpServer);

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
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
    'http://localhost:5173',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
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
        socketio: {
            connected: notificationService.getConnectedUsersCount(),
        },
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

// Sentry error handler (deve ser antes do error handler personalizado)
app.use(sentryService.errorHandler());

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

// Usar httpServer ao invés de app.listen para suportar Socket.io
httpServer.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🔒 Security headers enabled`);
    logger.info(`⏱️  Rate limiting active`);
    logger.info(`📝 Structured logging with Winston enabled`);
    logger.info(`🔌 Socket.io initialized and ready`);
    if (sentryService.isEnabled()) {
        logger.info(`🐛 Sentry error tracking enabled`);
    }
});
