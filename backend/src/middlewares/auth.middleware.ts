import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../config/jwt';
import { prisma } from '../config/database';
import { AppError } from '../utils/error-handler';

export interface AuthRequest extends Request {
  user?: any;
  admin?: any;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const decoded = verifyToken(token);
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id }
    });

    if (!admin) {
      throw new AppError('Admin not found', 404);
    }

    req.user = decoded;
    req.admin = admin;
    next();
  } catch (error) {
    next(error);
  }
};