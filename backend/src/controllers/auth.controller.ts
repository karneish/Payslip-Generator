import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user.id;
      const admin = await AuthService.getMe(adminId);

      res.json({
        success: true,
        admin
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user?.id;

      if (adminId) {
        const { prisma } = await import('../config/database');
        await prisma.auditLog.create({
          data: {
            adminId,
            action: 'LOGOUT',
            entityType: 'ADMIN',
            entityId: adminId,
            details: { ip: req.ip }
          }
        });
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, currentPassword, newPassword } = req.body;

      const result = await AuthService.changePassword(email, currentPassword, newPassword);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
}
