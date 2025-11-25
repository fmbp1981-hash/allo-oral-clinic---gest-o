import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate Limiter Middleware Configuration
 * Protects API from abuse and DDoS attacks
 */

// General API rate limiter - 100 requests per 15 minutes
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Muitas requisições deste IP, por favor tente novamente mais tarde.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Muitas requisições. Por favor, aguarde antes de tentar novamente.',
      retryAfter: Math.ceil(req.rateLimit.resetTime! / 1000),
    });
  },
});

// Strict limiter for authentication endpoints - 5 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    error: 'Muitas tentativas de login. Por segurança, aguarde antes de tentar novamente.',
    retryAfter: '15 minutos'
  },
  handler: (req: Request, res: Response) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip} on auth endpoint`);
    res.status(429).json({
      error: 'Muitas tentativas de login falhadas. Aguarde 15 minutos antes de tentar novamente.',
      retryAfter: Math.ceil(req.rateLimit.resetTime! / 1000),
    });
  },
});

// Medium limiter for search/query endpoints - 30 requests per minute
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 search requests per minute
  message: {
    error: 'Muitas buscas em um curto período. Por favor, aguarde um momento.',
    retryAfter: '1 minuto'
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Você está fazendo buscas muito rapidamente. Aguarde um momento.',
      retryAfter: Math.ceil(req.rateLimit.resetTime! / 1000),
    });
  },
});

// Strict limiter for write operations - 20 requests per 5 minutes
export const writeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Limit each IP to 20 write operations per 5 minutes
  message: {
    error: 'Muitas operações de escrita. Por favor, aguarde antes de continuar.',
    retryAfter: '5 minutos'
  },
  handler: (req: Request, res: Response) => {
    console.warn(`Write rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Você está fazendo muitas alterações. Aguarde alguns minutos.',
      retryAfter: Math.ceil(req.rateLimit.resetTime! / 1000),
    });
  },
});

// Very strict limiter for critical operations (delete all, etc) - 3 requests per hour
export const criticalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 critical operations per hour
  message: {
    error: 'Limite de operações críticas atingido. Aguarde antes de realizar esta ação novamente.',
    retryAfter: '1 hora'
  },
  handler: (req: Request, res: Response) => {
    console.error(`CRITICAL: Rate limit exceeded for IP: ${req.ip} on critical operation`);
    res.status(429).json({
      error: 'Limite de operações críticas atingido. Esta ação está temporariamente bloqueada.',
      retryAfter: Math.ceil(req.rateLimit.resetTime! / 1000),
    });
  },
});

/**
 * Custom rate limiter for specific use cases
 */
export const createCustomLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: options.message || 'Limite de requisições atingido.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};
