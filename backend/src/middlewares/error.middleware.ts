import { Request, Response, NextFunction } from 'express';
import { handleError } from '../utils/error-handler';
import { logger } from '../utils/logger';

export const errorMiddleware = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { message, statusCode } = handleError(error);
  
  logger.error(`Error: ${message}`, {
    path: req.path,
    method: req.method,
    statusCode,
    stack: error.stack
  });

  res.status(statusCode).json({
    success: false,
    message,
    timestamp: new Date().toISOString(),
    path: req.path
  });
};