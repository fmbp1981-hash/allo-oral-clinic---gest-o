import rateLimit from 'express-rate-limit';
import logger from '../lib/logger';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json({
      error: 'Muitas requisições. Tente novamente mais tarde.'
    });
  }
});

export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 login/register requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json({
      error: 'Muitas tentativas de login. Tente novamente em 1 hora.'
    });
  }
});

export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit search requests
  standardHeaders: true,
  legacyHeaders: false,
});

export const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Limit write operations
  standardHeaders: true,
  legacyHeaders: false,
});

export const criticalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit critical operations
  standardHeaders: true,
  legacyHeaders: false,
});
