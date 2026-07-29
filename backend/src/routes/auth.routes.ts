import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { loginSchema, changePasswordSchema } from '../validators/auth.validator';

const router = Router();

router.post('/login', validate(loginSchema), AuthController.login);
router.get('/me', authMiddleware, AuthController.getMe);
router.post('/logout', authMiddleware, AuthController.logout);
router.post('/change-password', authMiddleware, validate(changePasswordSchema), AuthController.changePassword);

export { router as authRoutes };
