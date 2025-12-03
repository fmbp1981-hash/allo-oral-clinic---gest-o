import { Router } from 'express';
import {
    getOpportunities,
    createOpportunity,
    searchOpportunities,
    updateOpportunityStatus,
    updateOpportunityNotes,
    deleteOpportunity,
    deleteAllOpportunities
} from '../controllers/opportunity.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { searchLimiter, writeLimiter, criticalLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Read operations
router.get('/', getOpportunities);

// Search with specific rate limiting (30 requests per minute)
// TEMPORARIAMENTE DESABILITADO - debug needed
// router.post('/search', searchLimiter, searchOpportunities);

// Write operations with rate limiting (20 requests per 5 minutes)
router.post('/', writeLimiter, createOpportunity);
router.patch('/:id/status', writeLimiter, updateOpportunityStatus);
router.patch('/:id/notes', writeLimiter, updateOpportunityNotes);
router.delete('/:id', writeLimiter, deleteOpportunity);

// Critical operation - very strict rate limiting (3 requests per hour)
router.delete('/', criticalLimiter, deleteAllOpportunities);

export default router;
