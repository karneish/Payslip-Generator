import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settings.service';

export class SettingsController {
  static async getCompanyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SettingsService.getCompanyProfile();

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateCompanyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SettingsService.updateCompanyProfile(req.body, req.user?.id);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSMTPConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SettingsService.getSMTPConfig();

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateSMTPConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SettingsService.updateSMTPConfig(req.body, req.user?.id);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async testSMTPConnection(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SettingsService.testSMTPConnection(req.user?.id);

      res.json({
        success: result.success,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAppSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const { category } = req.query;

      const result = await SettingsService.getAppSettings(category as string);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDepartments(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SettingsService.getDepartments();

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async createDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SettingsService.createDepartment(req.body);

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SettingsService.updateDepartment(req.params.id as string, req.body);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      await SettingsService.deleteDepartment(req.params.id as string);

      res.json({
        success: true,
        message: 'Department deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDesignations(req: Request, res: Response, next: NextFunction) {
    try {
      const { departmentId } = req.query;
      const result = await SettingsService.getDesignations(departmentId as string);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async createDesignation(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SettingsService.createDesignation(req.body);

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateDesignation(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SettingsService.updateDesignation(req.params.id as string, req.body);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteDesignation(req: Request, res: Response, next: NextFunction) {
    try {
      await SettingsService.deleteDesignation(req.params.id as string);

      res.json({
        success: true,
        message: 'Designation deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateAppSetting(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SettingsService.updateAppSetting(req.params.key as string, req.body.value, req.user?.id);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
