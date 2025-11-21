import { Router } from 'express';
import * as ClinicalRecordController from '../controllers/clinical-record.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', ClinicalRecordController.getClinicalRecords);
router.post('/', ClinicalRecordController.createClinicalRecord);
router.put('/:id', ClinicalRecordController.updateClinicalRecord);
router.delete('/:id', ClinicalRecordController.deleteClinicalRecord);

export default router;
