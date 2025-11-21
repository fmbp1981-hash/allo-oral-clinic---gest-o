import { Router } from 'express';
import * as SettingsController from '../controllers/settings.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', SettingsController.getSettings);
router.put('/', SettingsController.updateSettings);

export default router;
