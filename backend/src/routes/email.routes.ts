import { Router } from 'express';
import { EmailController } from '../controllers/email.controller';

const router = Router();

router.get('/', EmailController.getLogs);
router.get('/mailto-link', EmailController.generateMailtoLink);

export { router as emailRoutes };
