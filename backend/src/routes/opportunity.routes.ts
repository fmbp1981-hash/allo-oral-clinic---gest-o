import { Router } from 'express';
import * as OpportunityController from '../controllers/opportunity.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { searchLimiter, writeLimiter, criticalLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Read operations
router.get('/', OpportunityController.getOpportunities);

// Search with specific rate limiting (30 requests per minute)
router.post('/search', searchLimiter, OpportunityController.searchOpportunities);

// Write operations with rate limiting (20 requests per 5 minutes)
router.post('/', writeLimiter, OpportunityController.createOpportunity);
router.patch('/:id/status', writeLimiter, OpportunityController.updateOpportunityStatus);
router.patch('/:id/notes', writeLimiter, OpportunityController.updateOpportunityNotes);
router.delete('/:id', writeLimiter, OpportunityController.deleteOpportunity);

// Critical operation - very strict rate limiting (3 requests per hour)
router.delete('/', criticalLimiter, OpportunityController.deleteAllOpportunities);

export default router;
