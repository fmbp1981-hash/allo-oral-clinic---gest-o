import { Router } from 'express';
import * as NotificationController from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', NotificationController.getNotifications);
router.post('/', NotificationController.createNotification);
router.put('/:id/read', NotificationController.markAsRead);

export default router;
