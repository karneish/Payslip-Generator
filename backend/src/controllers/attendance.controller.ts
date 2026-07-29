import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from '../services/attendance.service';

export class AttendanceController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AttendanceService.create(req.body, req.user?.id);

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
      const { page = 1, limit = 10, employeeId, month, year, status } = req.query;

      const result = await AttendanceService.findAll({
        page: Number(page),
        limit: Number(limit),
        employeeId: employeeId as string,
        month: Number(month),
        year: Number(year),
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
      const result = await AttendanceService.findOne(req.params.id as string);

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
      const result = await AttendanceService.update(req.params.id as string, req.body, req.user?.id);

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
      await AttendanceService.delete(req.params.id as string, req.user?.id);

      res.json({
        success: true,
        message: 'Attendance record deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMonthlySummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { employeeId, month, year } = req.query;

      if (!employeeId) {
        const summaries = await AttendanceService.getMonthlySummaryForAll(
          Number(month),
          Number(year)
        );

        res.json({
          success: true,
          data: summaries
        });
        return;
      }

      const result = await AttendanceService.getMonthlySummary(
        employeeId as string,
        Number(month),
        Number(year)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDashboardAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const dateParam = req.query.date as string | undefined;
      const result = await AttendanceService.getDashboardAttendance(dateParam);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async syncFromJibble(req: Request, res: Response, next: NextFunction) {
    try {
      const { records } = req.body;

      const result = await AttendanceService.syncFromJibble(records, req.user?.id);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
}
