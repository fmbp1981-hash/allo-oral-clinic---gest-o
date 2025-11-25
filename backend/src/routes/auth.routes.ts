import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller';
import { authLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

// Apply strict rate limiting to auth endpoints (5 attempts per 15 minutes)
router.post('/login', authLimiter, AuthController.login);
router.post('/register', authLimiter, AuthController.register);
router.post('/refresh', authLimiter, AuthController.refresh);

export default router;
