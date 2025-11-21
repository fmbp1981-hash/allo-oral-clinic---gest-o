import { Router } from 'express';
import * as PatientController from '../controllers/patient.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', PatientController.getPatients);
router.post('/', PatientController.createPatient);
router.get('/:id', PatientController.getPatientById);

export default router;
