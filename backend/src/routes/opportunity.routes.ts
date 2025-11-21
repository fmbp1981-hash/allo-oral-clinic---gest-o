import { Router } from 'express';
import * as OpportunityController from '../controllers/opportunity.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', OpportunityController.getOpportunities);
router.post('/', OpportunityController.createOpportunity);

export default router;
