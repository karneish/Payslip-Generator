import { logger } from './logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const handleError = (error: any): { message: string; statusCode: number } => {
  logger.error('Error occurred:', error);

  // Multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return { message: 'File too large. Maximum size is 10MB.', statusCode: 400 };
  }
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return { message: 'Unexpected field name in upload.', statusCode: 400 };
  }
  if (error.name === 'MulterError') {
    return { message: error.message || 'File upload error', statusCode: 400 };
  }

  // Prisma errors
  if (error.code === 'P2002') {
    return {
      message: `Duplicate field value: ${error.meta?.target?.join(', ')}`,
      statusCode: 409
    };
  }

  if (error.code === 'P2025') {
    return {
      message: 'Record not found',
      statusCode: 404
    };
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return {
      message: 'Invalid token',
      statusCode: 401
    };
  }

  if (error.name === 'TokenExpiredError') {
    return {
      message: 'Token expired',
      statusCode: 401
    };
  }

  // Custom AppError
  if (error instanceof AppError) {
    return {
      message: error.message,
      statusCode: error.statusCode
    };
  }

  // Default error
  return {
    message: error.message || 'Internal server error',
    statusCode: error.statusCode || 500
  };
};