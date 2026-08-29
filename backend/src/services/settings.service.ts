import { prisma } from '../config/database';
import { AppError } from '../utils/error-handler';
import { logger } from '../utils/logger';
import nodemailer from 'nodemailer';

export class SettingsService {
  static async getCompanyProfile() {
    let profile = await prisma.companyProfile.findFirst();

    if (!profile) {
      profile = await prisma.companyProfile.create({
        data: {
          companyName: '',
          address: '',
          gstNumber: '',
          panNumber: '',
          phoneNumber: '',
          email: '',
          website: '',
          authorizedSignatory: '',
          footerText: ''
        }
      });
    }

    return profile;
  }

  static async updateCompanyProfile(data: any, adminId: string) {
    const existing = await prisma.companyProfile.findFirst();

    let profile;
    if (existing) {
      profile = await prisma.companyProfile.update({
        where: { id: existing.id },
        data: {
          companyName: data.companyName,
          address: data.address,
          logo: data.logo,
          gstNumber: data.gstNumber,
          panNumber: data.panNumber,
          phoneNumber: data.phoneNumber,
          email: data.email,
          website: data.website,
          authorizedSignatory: data.authorizedSignatory,
          footerText: data.footerText
        }
      });
    } else {
      profile = await prisma.companyProfile.create({
        data: {
          companyName: data.companyName || '',
          address: data.address || '',
          logo: data.logo || null,
          gstNumber: data.gstNumber || null,
          panNumber: data.panNumber || null,
          phoneNumber: data.phoneNumber || null,
          email: data.email || null,
          website: data.website || null,
          authorizedSignatory: data.authorizedSignatory || null,
          footerText: data.footerText || null
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'COMPANY_PROFILE_UPDATE',
        entityType: 'COMPANY_PROFILE',
        entityId: profile.id,
        details: { companyName: profile.companyName }
      }
    });

    logger.info(`Company profile updated: ${profile.companyName}`);
    return profile;
  }

  static async getSMTPConfig() {
    const config = await prisma.sMTPConfig.findFirst({
      select: {
        id: true,
        host: true,
        port: true,
        username: true,
        senderName: true,
        senderEmail: true,
        encryption: true,
        isDefault: true,
        isActive: true,
        lastTestAt: true,
        testStatus: true,
        testMessage: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return config;
  }

  static async updateSMTPConfig(data: any, adminId: string) {
    const existing = await prisma.sMTPConfig.findFirst();

    let config;
    if (existing) {
      config = await prisma.sMTPConfig.update({
        where: { id: existing.id },
        data: {
          host: data.host,
          port: data.port,
          username: data.username,
          password: data.password,
          senderName: data.senderName,
          senderEmail: data.senderEmail,
          encryption: data.encryption,
          isActive: data.isActive !== undefined ? data.isActive : true
        }
      });
    } else {
      config = await prisma.sMTPConfig.create({
        data: {
          host: data.host || 'smtp.gmail.com',
          port: data.port || 587,
          username: data.username,
          password: data.password,
          senderName: data.senderName || 'HR',
          senderEmail: data.senderEmail,
          encryption: data.encryption || 'TLS',
          isActive: data.isActive !== undefined ? data.isActive : true
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'SMTP_CONFIG_UPDATE',
        entityType: 'SMTP_CONFIG',
        entityId: config.id,
        details: { host: config.host, port: config.port, senderEmail: config.senderEmail }
      }
    });

    logger.info(`SMTP config updated: ${config.host}:${config.port}`);

    const safeConfig = { ...config, password: undefined };
    return safeConfig;
  }

  static async testSMTPConnection(adminId: string) {
    const config = await prisma.sMTPConfig.findFirst();

    if (!config) {
      throw new AppError('SMTP configuration not found', 404);
    }

    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: {
          user: config.username,
          pass: config.password
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      await transporter.verify();

      await prisma.sMTPConfig.update({
        where: { id: config.id },
        data: {
          lastTestAt: new Date(),
          testStatus: 'SUCCESS',
          testMessage: 'SMTP connection verified successfully'
        }
      });

      await prisma.auditLog.create({
        data: {
          adminId,
          action: 'SMTP_TEST',
          entityType: 'SMTP_CONFIG',
          entityId: config.id,
          details: { status: 'SUCCESS' }
        }
      });

      logger.info('SMTP connection test successful');
      return { success: true, message: 'SMTP connection verified successfully' };
    } catch (error: any) {
      await prisma.sMTPConfig.update({
        where: { id: config.id },
        data: {
          lastTestAt: new Date(),
          testStatus: 'FAILED',
          testMessage: error.message || 'Connection failed'
        }
      });

      await prisma.auditLog.create({
        data: {
          adminId,
          action: 'SMTP_TEST',
          entityType: 'SMTP_CONFIG',
          entityId: config.id,
          details: { status: 'FAILED', error: error.message }
        }
      });

      logger.error(`SMTP connection test failed: ${error.message}`);
      return { success: false, message: error.message || 'SMTP connection test failed' };
    }
  }

  static async getAppSettings(category?: string) {
    const where: any = {};
    if (category) {
      where.category = category;
    }

    const settings = await prisma.setting.findMany({
      where,
      orderBy: { key: 'asc' }
    });

    return settings;
  }

  static async getDepartments() {
    return prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  static async createDepartment(data: { name: string; code: string; description?: string; head?: string }) {
    const existing = await prisma.department.findFirst({
      where: { OR: [{ name: data.name }, { code: data.code }], isActive: true }
    });
    if (existing) {
      throw new AppError('Department with this name or code already exists', 409);
    }
    const inactiveMatch = await prisma.department.findFirst({
      where: { OR: [{ name: data.name }, { code: data.code }], isActive: false }
    });
    if (inactiveMatch) {
      return prisma.department.update({
        where: { id: inactiveMatch.id },
        data: { name: data.name, code: data.code, description: data.description, head: data.head, isActive: true }
      });
    }
    return prisma.department.create({ data: { ...data, isActive: true } });
  }

  static async updateDepartment(id: string, data: { name?: string; code?: string; description?: string; head?: string; isActive?: boolean }) {
    const dept = await prisma.department.findUnique({ where: { id } });
    if (!dept) {
      throw new AppError('Department not found', 404);
    }
    return prisma.department.update({ where: { id }, data });
  }

  static async deleteDepartment(id: string) {
    const dept = await prisma.department.findUnique({ where: { id } });
    if (!dept) {
      throw new AppError('Department not found', 404);
    }
    return prisma.department.update({ where: { id }, data: { isActive: false } });
  }

  static async getDesignations(departmentId?: string) {
    if (departmentId) {
      return prisma.designation.findMany({
        where: { departmentId, isActive: true },
        orderBy: { name: 'asc' }
      });
    }
    return prisma.designation.findMany({
      where: { isActive: true },
      include: { department: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' }
    });
  }

  static async createDesignation(data: { name: string; code: string; departmentId: string; description?: string }) {
    const existing = await prisma.designation.findFirst({
      where: { OR: [{ name: data.name }, { code: data.code }], isActive: true }
    });
    if (existing) {
      throw new AppError('Designation with this name or code already exists', 409);
    }
    const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
    if (!dept) {
      throw new AppError('Department not found', 404);
    }
    const inactiveMatch = await prisma.designation.findFirst({
      where: { OR: [{ name: data.name }, { code: data.code }], isActive: false }
    });
    if (inactiveMatch) {
      return prisma.designation.update({
        where: { id: inactiveMatch.id },
        data: { name: data.name, code: data.code, departmentId: data.departmentId, description: data.description, isActive: true }
      });
    }
    return prisma.designation.create({ data: { ...data, isActive: true } });
  }

  static async updateDesignation(id: string, data: { name?: string; code?: string; departmentId?: string; description?: string; isActive?: boolean }) {
    const desig = await prisma.designation.findUnique({ where: { id } });
    if (!desig) {
      throw new AppError('Designation not found', 404);
    }
    return prisma.designation.update({ where: { id }, data });
  }

  static async deleteDesignation(id: string) {
    const desig = await prisma.designation.findUnique({ where: { id } });
    if (!desig) {
      throw new AppError('Designation not found', 404);
    }
    return prisma.designation.update({ where: { id }, data: { isActive: false } });
  }

  static async updateAppSetting(key: string, value: string, adminId: string) {
    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: {
        key,
        value,
        category: 'GENERAL',
        isEditable: true
      }
    });

    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'APP_SETTING_UPDATE',
        entityType: 'SETTING',
        entityId: setting.id,
        details: { key, value }
      }
    });

    logger.info(`App setting updated: ${key} = ${value}`);
    return setting;
  }
}
