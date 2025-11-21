import { Router } from 'express';
import * as UserController from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', UserController.getUsers);
router.post('/', UserController.createUser);

export default router;
