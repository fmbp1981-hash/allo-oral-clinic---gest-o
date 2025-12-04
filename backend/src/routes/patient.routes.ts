import { Router } from 'express';
import * as PatientController from '../controllers/patient.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', PatientController.getPatients);
router.post('/', PatientController.createPatient);
router.post('/import', PatientController.importPatients);
router.get('/search', PatientController.searchPatients);
router.get('/:id', PatientController.getPatientById);
router.put('/:id', PatientController.updatePatient);
router.delete('/:id', PatientController.deletePatient);

export default router;
