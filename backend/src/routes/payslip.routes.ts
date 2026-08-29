import { Router } from 'express';
import { PayslipController } from '../controllers/payslip.controller';
import { validate } from '../middlewares/validation.middleware';
import {
  createPayslipSchema,
  updatePayslipSchema,
  payslipQuerySchema,
  payslipIdParamSchema
} from '../validators/payslip.validator';

const router = Router();

router.post('/', validate(createPayslipSchema), PayslipController.create);
router.get('/stats', PayslipController.getPayslipStats);
router.get('/', validate(payslipQuerySchema), PayslipController.findAll);
router.get('/:id/review', validate(payslipIdParamSchema), PayslipController.getReviewData);
router.get('/:id/download', validate(payslipIdParamSchema), PayslipController.downloadPayslip);
router.get('/:id', validate(payslipIdParamSchema), PayslipController.findOne);
router.put('/:id', validate(updatePayslipSchema), PayslipController.update);
router.post('/:id/generate', validate(payslipIdParamSchema), PayslipController.generatePayslip);
router.post('/:id/send-email', validate(payslipIdParamSchema), PayslipController.sendPayslipEmail);
router.delete('/:id', validate(payslipIdParamSchema), PayslipController.delete);

export { router as payslipRoutes };
