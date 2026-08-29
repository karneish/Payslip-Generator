import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../utils/error-handler';
import { logger } from '../utils/logger';
import { EmployeeService } from '../services/employee.service';

export class EmployeeController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const employee = await EmployeeService.create(req.body, req.user?.id);
      
      res.status(201).json({
        success: true,
        employee
      });
    } catch (error) {
      next(error);
    }
  }

  static async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10, search, department, status } = req.query;
      
      const employees = await EmployeeService.findAll({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        department: department as string,
        status: status as string
      });
      
      res.json({
        success: true,
        ...employees
      });
    } catch (error) {
      next(error);
    }
  }

  static async findOne(req: Request, res: Response, next: NextFunction) {
    try {
      const employee = await EmployeeService.findOne(req.params.id as string);
      
      res.json({
        success: true,
        employee
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const employee = await EmployeeService.update(req.params.id as string, req.body, req.user?.id);
      
      res.json({
        success: true,
        employee
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const force = req.query.force === 'true' || req.body.force === true;
      await EmployeeService.delete(req.params.id as string, req.user?.id, force);
      
      res.json({
        success: true,
        message: 'Employee deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDependencies(req: Request, res: Response, next: NextFunction) {
    try {
      const dependencies = await EmployeeService.getDependencies(req.params.id as string);
      
      res.json({
        success: true,
        data: dependencies
      });
    } catch (error) {
      next(error);
    }
  }

  static async importEmployees(req: Request, res: Response, next: NextFunction) {
    try {
      const { employees } = req.body;
      
      const result = await EmployeeService.importEmployees(employees, req.user?.id);
      
      res.json({
        ...result,
        success: true
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSalaryHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await EmployeeService.getSalaryHistory(req.params.id as string);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async addSalaryHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await EmployeeService.addSalaryHistory(req.params.id as string, req.body);

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async exportEmployees(req: Request, res: Response, next: NextFunction) {
    try {
      const format = (req.params.format as string) || 'excel';
      
      const data = await EmployeeService.exportEmployees(format);
      
      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }
}
