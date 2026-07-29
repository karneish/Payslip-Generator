import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service';

export class AuditController {
  static async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, action, entityType, adminId, startDate, endDate } = req.query;

      const result = await AuditService.findAll({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        action: action as string,
        entityType: entityType as string,
        adminId: adminId as string,
        startDate: startDate as string,
        endDate: endDate as string
      });

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAuditStats(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuditService.getAuditStats();

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
