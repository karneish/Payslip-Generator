import { Request, Response, NextFunction } from 'express';
import { JibbleService } from './jibble.service';
import { AppError } from '../../utils/error-handler';

export class JibbleController {
  static async syncAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.body;

      if (!startDate || !endDate) {
        throw new AppError('startDate and endDate are required', 400);
      }

      const adminId = req.user?.id;
      if (!adminId) {
        throw new AppError('Unauthorized', 401);
      }

      const result = await JibbleService.syncAttendance(startDate, endDate, adminId);

      res.status(200).json({
        success: true,
        message: `Sync complete: ${result.synced} synced (${result.created} created, ${result.updated} updated), ${result.failed} failed`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getLiveAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        throw new AppError('startDate and endDate query params are required', 400);
      }

      const data = await JibbleService.getLiveAttendance(
        startDate as string,
        endDate as string
      );

      res.status(200).json({
        success: true,
        data,
        meta: {
          startDate,
          endDate,
          totalRecords: data.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async testConnection(_req: Request, res: Response, next: NextFunction) {
    try {
      const token = await JibbleService.getAccessToken();
      const people = await JibbleService.fetchPeople();

      res.status(200).json({
        success: true,
        message: 'Jibble connection successful',
        data: {
          tokenObtained: true,
          peopleCount: people.length,
          people: people.map(p => ({
            id: p.id,
            fullName: p.fullName,
            status: p.status,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSyncHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;

      const result = await JibbleService.getSyncHistory({ page, limit });

      res.status(200).json({
        success: true,
        data: result.records,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async mapEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const { employeeId, jibbleEmployeeId, jibbleUserId } = req.body;

      if (!employeeId || !jibbleEmployeeId || !jibbleUserId) {
        throw new AppError('employeeId, jibbleEmployeeId, and jibbleUserId are required', 400);
      }

      const employee = await JibbleService.mapJibbleEmployee(
        employeeId,
        jibbleEmployeeId,
        jibbleUserId
      );

      res.status(200).json({
        success: true,
        message: 'Employee mapped to Jibble successfully',
        data: employee,
      });
    } catch (error) {
      next(error);
    }
  }

  static async fetchEmployees(_req: Request, res: Response, next: NextFunction) {
    try {
      const employees = await JibbleService.fetchPeople();

      res.status(200).json({
        success: true,
        data: employees,
      });
    } catch (error) {
      next(error);
    }
  }

  static async provisionEmployees(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await JibbleService.provisionEmployeesFromJibble();

      res.status(200).json({
        success: true,
        message: `Provisioned ${result.created} new employees, mapped ${result.mapped} existing, skipped ${result.skipped}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
