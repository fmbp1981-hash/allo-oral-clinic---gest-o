import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller';
import { authLimiter } from '../middlewares/rateLimiter.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { loginSchema, registerSchema, refreshSchema } from '../schemas/auth.schema';

const router = Router();

// Apply strict rate limiting to auth endpoints (5 attempts per 15 minutes)
router.post('/login', authLimiter, validate(loginSchema), AuthController.login);
router.post('/register', authLimiter, validate(registerSchema), AuthController.register);
router.post('/refresh', authLimiter, validate(refreshSchema), AuthController.refresh);
router.post('/logout', authenticate, AuthController.logout);

// Password reset endpoints
router.post('/request-password-reset', authLimiter, AuthController.requestPasswordReset);
router.post('/reset-password', authLimiter, AuthController.resetPassword);

export default router;
