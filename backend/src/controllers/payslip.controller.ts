import { Request, Response, NextFunction } from 'express';
import { PayslipService } from '../services/payslip.service';
import { EmailService } from '../services/email.service';
import { prisma } from '../config/database';
import { AppError } from '../utils/error-handler';
import fs from 'fs';
import path from 'path';

export class PayslipController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PayslipService.create(req.body, req.user?.id);

      res.status(201).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  static async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10, month, year, employeeId, department, status } = req.query;

      const result = await PayslipService.findAll({
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        month: month != null ? Number(month) : undefined,
        year: year != null ? Number(year) : undefined,
        employeeId: employeeId as string,
        department: department as string,
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

  static async findOne(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PayslipService.findOne(req.params.id as string);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PayslipService.update(req.params.id as string, req.body, req.user?.id);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await PayslipService.delete(req.params.id as string, req.user?.id);

      res.json({
        success: true,
        message: 'Payslip deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getReviewData(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PayslipService.getReviewData(req.params.id as string);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async generatePayslip(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PayslipService.generatePayslip(req.params.id as string, req.user?.id);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPayslipStats(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PayslipService.getPayslipStats();

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async downloadPayslip(req: Request, res: Response, next: NextFunction) {
    try {
      const payslipId = req.params.id as string;
      const payslip = await prisma.payslip.findUnique({
        where: { id: payslipId },
        include: { employee: true }
      }) as any;

      if (!payslip) {
        throw new AppError('Payslip not found', 404);
      }

      const empName = payslip.employee?.employeeName || 'Employee';

      const result = await PayslipService.generatePayslip(payslip.id, req.user?.id || '');
      const fullPath = path.resolve(result.pdfPath);
      if (!fs.existsSync(fullPath)) {
        throw new AppError('PDF file not found after generation', 404);
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${empName}_payslip.pdf"`);
      fs.createReadStream(fullPath).pipe(res);
    } catch (error) {
      next(error);
    }
  }

  static async sendPayslipEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const payslipId = req.params.id as string;
      const payslip = await prisma.payslip.findUnique({
        where: { id: payslipId },
        include: { employee: true }
      }) as any;

      if (!payslip) {
        throw new AppError('Payslip not found', 404);
      }

      if (!payslip.pdfPath || !fs.existsSync(path.resolve(payslip.pdfPath))) {
        await PayslipService.generatePayslip(payslip.id, req.user?.id || '');
        const updated = await prisma.payslip.findUnique({ where: { id: payslipId } });
        if (!updated?.pdfPath) {
          throw new AppError('Failed to generate PDF for email', 500);
        }
        payslip.pdfPath = updated.pdfPath;
      }

      const result = await EmailService.sendPayslipEmail(
        payslip.employeeId,
        payslip.id,
        payslip.pdfPath || '',
        req.user?.id || ''
      );

      res.json({
        success: result.success,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}
