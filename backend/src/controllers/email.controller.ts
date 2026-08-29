import { Request, Response, NextFunction } from 'express';
import { EmailService } from '../services/email.service';

export class EmailController {
  static async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10, employeeId, status } = req.query;

      const result = await EmailService.getEmailLogs({
        page: Number(page),
        limit: Number(limit),
        employeeId: employeeId as string,
        status: status as string
      });

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  static async generateMailtoLink(req: Request, res: Response, next: NextFunction) {
    try {
      const { employeeEmail, employeeName, month, year } = req.query;

      if (!employeeEmail || !employeeName || !month || !year) {
        res.status(400).json({
          success: false,
          message: 'employeeEmail, employeeName, month, and year are required'
        });
        return;
      }

      const link = await EmailService.generateMailtoLink(
        employeeEmail as string,
        employeeName as string,
        Number(month),
        Number(year)
      );

      res.json({
        success: true,
        data: { mailtoLink: link }
      });
    } catch (error) {
      next(error);
    }
  }
}
