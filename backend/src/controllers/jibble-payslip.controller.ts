import { Request, Response, NextFunction } from 'express';
import { JibblePayslipService } from '../services/jibble-payslip.service';
import { AppError } from '../utils/error-handler';
import path from 'path';
import fs from 'fs';

export class JibblePayslipController {
  static async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const { month, year } = req.body;

      if (!month || !year) {
        throw new AppError('month and year are required', 400);
      }

      const result = await JibblePayslipService.preview(Number(month), Number(year));

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async save(req: Request, res: Response, next: NextFunction) {
    try {
      const { month, year } = req.body;

      if (!month || !year) {
        throw new AppError('month and year are required', 400);
      }

      const result = await JibblePayslipService.save(Number(month), Number(year), req.user?.id);

      res.status(201).json({
        success: true,
        message: `Saved ${result.count} Jibble payslips for ${month}/${year}`,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10, month, year, employeeId, department, status } = req.query;

      const result = await JibblePayslipService.findAll({
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        month: month != null ? Number(month) : undefined,
        year: year != null ? Number(year) : undefined,
        employeeId: employeeId as string,
        department: department as string,
        status: status as string,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async findOne(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await JibblePayslipService.findOne(req.params.id as string);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await JibblePayslipService.update(req.params.id as string, req.body, req.user?.id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await JibblePayslipService.delete(req.params.id as string, req.user?.id);

      res.json({
        success: true,
        message: 'Jibble payslip deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getReviewData(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await JibblePayslipService.getReviewData(req.params.id as string);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async generatePayslip(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await JibblePayslipService.generatePayslip(req.params.id as string, req.user?.id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async downloadPayslip(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const payslip = await JibblePayslipService.findOne(id);
      const pdfPath = await JibblePayslipService.downloadPayslip(id, req.user?.id || '');

      const fullPath = path.resolve(pdfPath);
      if (!fs.existsSync(fullPath)) {
        throw new AppError('PDF file not found', 404);
      }

      const safeName = (payslip.employee?.employeeName || 'Employee').replace(/[^a-zA-Z0-9]/g, '');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}_payslip.pdf"`);
      fs.createReadStream(fullPath).pipe(res);
    } catch (error) {
      next(error);
    }
  }
}