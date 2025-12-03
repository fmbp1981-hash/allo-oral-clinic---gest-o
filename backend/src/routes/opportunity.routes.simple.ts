import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Temporary simple implementation - apenas para o servidor iniciar
router.get('/', async (req: Request, res: Response) => {
    res.json([]);
});

export default router;
