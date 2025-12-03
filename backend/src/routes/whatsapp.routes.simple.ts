import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Temporary simple implementation
router.get('/status', async (req: Request, res: Response) => {
    res.json({ status: 'not_configured' });
});

export default router;
