import { Router } from 'express';
import { JibblePayslipController } from '../controllers/jibble-payslip.controller';
import { validate } from '../middlewares/validation.middleware';
import { jibblePayslipIdParamSchema } from '../validators/jibble-payslip.validator';

const router = Router();

router.post('/preview', JibblePayslipController.preview);
router.post('/save', JibblePayslipController.save);
router.get('/', JibblePayslipController.findAll);
router.get('/:id/review', validate(jibblePayslipIdParamSchema), JibblePayslipController.getReviewData);
router.get('/:id/download', validate(jibblePayslipIdParamSchema), JibblePayslipController.downloadPayslip);
router.get('/:id', validate(jibblePayslipIdParamSchema), JibblePayslipController.findOne);
router.put('/:id', validate(jibblePayslipIdParamSchema), JibblePayslipController.update);
router.post('/:id/generate', validate(jibblePayslipIdParamSchema), JibblePayslipController.generatePayslip);
router.delete('/:id', validate(jibblePayslipIdParamSchema), JibblePayslipController.delete);

export { router as jibblePayslipRoutes };