import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';

const router = Router();

router.get('/stats', AuditController.getAuditStats);
router.get('/', AuditController.findAll);

export { router as auditRoutes };
