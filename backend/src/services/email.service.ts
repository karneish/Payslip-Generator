import nodemailer from 'nodemailer';
import fs from 'fs';
import { prisma } from '../config/database';
import { AppError } from '../utils/error-handler';
import { logger } from '../utils/logger';
import { getMonthName } from '../utils/date-utils';

export class EmailService {
  static async getTransporter() {
    const config = await prisma.sMTPConfig.findFirst({
      where: { isActive: true }
    });

    if (!config) {
      return null;
    }

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

    return { transporter, config };
  }

  static async sendPayslipEmail(employeeId: string, payslipId: string, pdfPath: string, adminId: string) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    const payslip = await prisma.payslip.findUnique({ where: { id: payslipId } });
    if (!payslip) {
      throw new AppError('Payslip not found', 404);
    }

    const smtp = await this.getTransporter();
    if (!smtp) {
      await prisma.emailLog.create({
        data: {
          employeeId,
          payslipId,
          emailType: 'PAYSLIP',
          recipientEmail: employee.email,
          subject: `Payslip for ${getMonthName(payslip.month)} ${payslip.year}`,
          body: 'SMTP not configured',
          attachmentPath: pdfPath,
          status: 'FAILED'
        }
      });
      return { success: false, message: 'SMTP not configured. Please configure SMTP settings first.' };
    }

    const { transporter, config } = smtp;

    const monthName = getMonthName(payslip.month);
    const subject = `Payslip for ${monthName} ${payslip.year} - ${employee.employeeName}`;
    const body = `Dear ${employee.employeeName},\n\nPlease find attached your payslip for ${monthName} ${payslip.year}.\n\nNet Salary: ₹${Math.round(payslip.netSalary)}\n\nBest regards,\n${config.senderName || 'HR'}`;

    const emailLog = await prisma.emailLog.create({
      data: {
        employeeId,
        payslipId,
        emailType: 'PAYSLIP',
        recipientEmail: employee.email,
        subject,
        body,
        attachmentPath: pdfPath,
        status: 'SENDING'
      }
    });

    try {
      const attachments = [];
      if (pdfPath && fs.existsSync(pdfPath)) {
        attachments.push({
          filename: `${employee.employeeCode}_payslip_${payslip.month}_${payslip.year}.pdf`,
          path: pdfPath
        });
      }

      await transporter.sendMail({
        from: `"${config.senderName}" <${config.senderEmail}>`,
        to: employee.email,
        subject,
        text: body,
        attachments
      });

      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'SENT',
          sentAt: new Date()
        }
      });

      await prisma.payslip.update({
        where: { id: payslipId },
        data: {
          sentAt: new Date(),
          sentBy: adminId
        }
      });

      await prisma.auditLog.create({
        data: {
          adminId,
          action: 'EMAIL_SENT',
          entityType: 'EMAIL_LOG',
          entityId: emailLog.id,
          details: { employeeId, payslipId, recipientEmail: employee.email }
        }
      });

      logger.info(`Payslip email sent to ${employee.email} for ${monthName} ${payslip.year}`);
      return { success: true, emailLogId: emailLog.id, message: 'Email sent successfully' };
    } catch (error: any) {
      const errorMessage = error.code === 'ECONNREFUSED'
        ? `SMTP connection refused. Check SMTP host/port settings (current: ${config.host}:${config.port}).`
        : error.code === 'EAUTH'
        ? 'SMTP authentication failed. Check username/password in SMTP settings.'
        : error.code === 'ENOTFOUND'
        ? `SMTP host '${config.host}' not found. Check SMTP configuration.`
        : error.message || 'Failed to send email';

      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'FAILED',
          errorMessage
        }
      });

      logger.error(`Failed to send email to ${employee.email}: ${errorMessage}`);
      return { success: false, emailLogId: emailLog.id, message: errorMessage };
    }
  }

  static async getEmailLogs(filters: { page?: number; limit?: number; employeeId?: string; status?: string }) {
    const { page = 1, limit = 10, employeeId, status } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status) {
      where.status = status;
    }

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              employeeName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.emailLog.count({ where })
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async generateMailtoLink(employeeEmail: string, employeeName: string, month: number, year: number) {
    const monthName = getMonthName(month);
    const subject = encodeURIComponent(`Payslip for ${monthName} ${year}`);
    const body = encodeURIComponent(
      `Dear ${employeeName},\n\n` +
      `Please find attached your payslip for ${monthName} ${year}.\n\n` +
      `Best regards,\nHR`
    );

    return `mailto:${employeeEmail}?subject=${subject}&body=${body}`;
  }
}
