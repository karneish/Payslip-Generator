import { Request, Response, NextFunction } from 'express';
import { UploadService } from '../services/upload.service';
import { AppError } from '../utils/error-handler';

export class UploadController {
  static async uploadFile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError('No file uploaded. Please select a CSV or Excel file.', 400);
      }

      const month = Number(req.body.month) || (new Date().getMonth() + 1);
      const year = Number(req.body.year) || new Date().getFullYear();
      const adminId = req.user?.id || req.admin?.id;

      if (!adminId) {
        throw new AppError('Authentication required', 401);
      }

      const result = await UploadService.uploadFile(req.file, month, year, adminId);

      res.status(201).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUploads(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const result = await UploadService.getUploads({
        page: Number(page),
        limit: Number(limit)
      });

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUploadById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await UploadService.getUploadById(req.params.id as string);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async saveParsedData(req: Request, res: Response, next: NextFunction) {
    try {
      const { data } = req.body;

      if (!data || !Array.isArray(data)) {
        throw new AppError('Invalid data format', 400);
      }

      const result = await UploadService.saveParsedData(req.params.id as string, data, req.user?.id || req.admin?.id);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteUpload(req: Request, res: Response, next: NextFunction) {
    try {
      await UploadService.deleteUpload(req.params.id as string, req.user?.id);

      res.json({
        success: true,
        message: 'Upload deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}
