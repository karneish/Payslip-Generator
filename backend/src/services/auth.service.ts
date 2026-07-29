import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { generateToken } from '../config/jwt';
import { AppError } from '../utils/error-handler';
import { logger } from '../utils/logger';

export class AuthService {
  static async login(email: string, password: string) {
    const admin = await prisma.admin.findUnique({
      where: { email }
    });

    if (!admin) {
      throw new AppError('Invalid credentials', 401);
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);

    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!admin.isActive) {
      throw new AppError('Account is disabled', 403);
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() }
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'LOGIN',
        entityType: 'ADMIN',
        entityId: admin.id,
        details: { email }
      }
    });

    const token = generateToken({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role
    });

    logger.info(`Admin logged in: ${admin.email}`);

    return {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    };
  }

  static async getMe(adminId: string) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true
      }
    });

    if (!admin) {
      throw new AppError('Admin not found', 404);
    }

    return admin;
  }

  static async changePassword(email: string, currentPassword: string, newPassword: string) {
    const admin = await prisma.admin.findUnique({
      where: { email }
    });

    if (!admin) {
      throw new AppError('Admin not found', 404);
    }

    const isValidPassword = await bcrypt.compare(currentPassword, admin.password);

    if (!isValidPassword) {
      throw new AppError('Current password is incorrect', 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.admin.update({
      where: { id: admin.id },
      data: { password: hashedPassword }
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'PASSWORD_CHANGE',
        entityType: 'ADMIN',
        entityId: admin.id
      }
    });

    logger.info(`Password changed for admin: ${admin.email}`);

    return { message: 'Password changed successfully' };
  }
}
