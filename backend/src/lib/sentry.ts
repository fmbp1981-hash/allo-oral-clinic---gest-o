import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { Express, Request, Response, NextFunction } from 'express';
import logger from './logger';

interface SentryConfig {
    dsn?: string;
    environment: string;
    release?: string;
    tracesSampleRate: number;
    profilesSampleRate: number;
}

class SentryService {
    private isInitialized: boolean = false;

    initialize(app: Express): void {
        const dsn = process.env.SENTRY_DSN;

        if (!dsn) {
            logger.info('Sentry DSN not configured, error tracking disabled');
            return;
        }

        const config: SentryConfig = {
            dsn,
            environment: process.env.NODE_ENV || 'development',
            release: process.env.APP_VERSION || '1.0.0',
            tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
            profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
        };

        Sentry.init({
            dsn: config.dsn,
            environment: config.environment,
            release: config.release,
            integrations: [
                // Enable HTTP calls tracing
                new Sentry.Integrations.Http({ tracing: true }),
                // Enable Express.js middleware tracing
                new Sentry.Integrations.Express({ app }),
                // Enable profiling
                nodeProfilingIntegration(),
            ],
            // Performance Monitoring
            tracesSampleRate: config.tracesSampleRate,
            // Profiling
            profilesSampleRate: config.profilesSampleRate,
            // Filter out sensitive data
            beforeSend(event) {
                // Remove sensitive headers
                if (event.request?.headers) {
                    delete event.request.headers['authorization'];
                    delete event.request.headers['cookie'];
                }
                // Remove sensitive body data
                if (event.request?.data) {
                    const data = typeof event.request.data === 'string' 
                        ? JSON.parse(event.request.data) 
                        : event.request.data;
                    
                    if (data.password) data.password = '[FILTERED]';
                    if (data.newPassword) data.newPassword = '[FILTERED]';
                    if (data.resetToken) data.resetToken = '[FILTERED]';
                    if (data.refreshToken) data.refreshToken = '[FILTERED]';
                    
                    event.request.data = typeof event.request.data === 'string' 
                        ? JSON.stringify(data) 
                        : data;
                }
                return event;
            },
        });

        this.isInitialized = true;
        logger.info('Sentry initialized', { environment: config.environment });
    }

    // Request handler - must be the first middleware
    requestHandler() {
        if (!this.isInitialized) {
            return (_req: Request, _res: Response, next: NextFunction) => next();
        }
        return Sentry.Handlers.requestHandler();
    }

    // Tracing handler - must be before routes
    tracingHandler() {
        if (!this.isInitialized) {
            return (_req: Request, _res: Response, next: NextFunction) => next();
        }
        return Sentry.Handlers.tracingHandler();
    }

    // Error handler - must be after routes
    errorHandler() {
        if (!this.isInitialized) {
            return (error: Error, _req: Request, _res: Response, next: NextFunction) => {
                next(error);
            };
        }
        return Sentry.Handlers.errorHandler();
    }

    // Capture exception manually
    captureException(error: Error, context?: Record<string, any>): void {
        if (!this.isInitialized) {
            logger.error('Error (Sentry not initialized):', error, context);
            return;
        }

        Sentry.withScope((scope) => {
            if (context) {
                scope.setContext('additional', context);
            }
            Sentry.captureException(error);
        });
    }

    // Capture message
    captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
        if (!this.isInitialized) {
            logger.info(`Sentry message (not sent): ${message}`);
            return;
        }

        Sentry.captureMessage(message, level);
    }

    // Set user context
    setUser(user: { id: string; email?: string; tenantId?: string }): void {
        if (!this.isInitialized) return;

        Sentry.setUser({
            id: user.id,
            email: user.email,
            // Custom data
            tenantId: user.tenantId,
        });
    }

    // Clear user context
    clearUser(): void {
        if (!this.isInitialized) return;
        Sentry.setUser(null);
    }

    // Add breadcrumb
    addBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
        if (!this.isInitialized) return;

        Sentry.addBreadcrumb({
            message,
            category,
            data,
            level: 'info',
        });
    }

    // Check if Sentry is initialized
    isEnabled(): boolean {
        return this.isInitialized;
    }
}

// Singleton instance
export const sentryService = new SentryService();
