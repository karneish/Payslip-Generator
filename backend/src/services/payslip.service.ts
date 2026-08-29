import { prisma } from '../config/database';
import { AppError } from '../utils/error-handler';
import { logger } from '../utils/logger';
import {
  calculateWorkingDays,
  calculateGrossSalary,
  calculatePFDeduction,
  calculateESIDeduction,
  calculateProfessionalTax,
  roundOffAmount,
  convertToWords
} from '../utils/salary-calculator';
import { PdfService } from './pdf.service';

export class PayslipService {
  static async create(data: any, adminId: string) {
    const {
      employeeId, month, year,
      basicSalary, hra, da, medicalAllowance, travelAllowance, specialAllowance, otherAllowances,
      bonus = 0, incentive = 0, overtimePay = 0,
      pfDeduction, esiDeduction, professionalTax, incomeTax = 0,
      leaveDeduction = 0, lateDeduction = 0, otherDeductions = 0, advanceDeduction = 0,
      leaveDays = 0, lopDays = 0, status = 'DRAFT'
    } = data;

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    const workingDaysInfo = calculateWorkingDays(year, month);
    const workingDays = workingDaysInfo.workingDays;
    const totalDays = workingDaysInfo.totalDays;
    const weekendDays = workingDaysInfo.weekendDays;

    const payableDays = workingDays - leaveDays - lopDays;

    const calculatedGross = calculateGrossSalary(
      basicSalary, hra, da, medicalAllowance, travelAllowance, specialAllowance, otherAllowances
    );
    const totalEarnings = roundOffAmount(calculatedGross + bonus + incentive + overtimePay);

    const calculatedPF = pfDeduction !== undefined ? pfDeduction : calculatePFDeduction(basicSalary);
    const calculatedESI = esiDeduction !== undefined ? esiDeduction : calculateESIDeduction(calculatedGross);
    const calculatedPT = professionalTax !== undefined ? professionalTax : calculateProfessionalTax(calculatedGross);

    const totalDeductions = roundOffAmount(
      calculatedPF + calculatedESI + calculatedPT + incomeTax + leaveDeduction + lateDeduction + otherDeductions + advanceDeduction
    );

    const netSalary = roundOffAmount(totalEarnings - totalDeductions);
    const amountInWords = convertToWords(netSalary);

    const payslipData = {
      employeeId,
      month,
      year,
      totalDays,
      workingDays,
      presentDays: workingDays - (leaveDays + lopDays),
      absentDays: leaveDays + lopDays,
      leaveDays,
      holidayDays: 0,
      weekendDays,
      lopDays,
      payableDays,
      basicSalary,
      hra,
      da,
      medicalAllowance,
      travelAllowance,
      specialAllowance,
      otherAllowances,
      bonus,
      incentive,
      overtimePay,
      totalEarnings,
      pfDeduction: calculatedPF,
      esiDeduction: calculatedESI,
      professionalTax: calculatedPT,
      incomeTax,
      leaveDeduction,
      lateDeduction,
      otherDeductions,
      advanceDeduction,
      totalDeductions,
      grossSalary: calculatedGross,
      netSalary,
      amountInWords,
      status
    };

    const existingPayslip = await prisma.payslip.findUnique({
      where: { employeeId_month_year: { employeeId, month, year } }
    });

    let payslip: any;
    if (existingPayslip) {
      payslip = await prisma.payslip.update({
        where: { id: existingPayslip.id },
        data: payslipData,
        include: { employee: true }
      });

      await prisma.auditLog.create({
        data: {
          adminId,
          action: 'PAYSLIP_UPDATE',
          entityType: 'PAYSLIP',
          entityId: payslip.id,
          details: { employeeId, month, year, netSalary, note: 'Auto-updated on duplicate create' }
        }
      });

      logger.info(`Payslip updated for employee ${employee.employeeCode} (${month}/${year}): Net ₹${netSalary}`);
    } else {
      payslip = await prisma.payslip.create({
        data: payslipData,
        include: { employee: true }
      });

      await prisma.auditLog.create({
        data: {
          adminId,
          action: 'PAYSLIP_CREATE',
          entityType: 'PAYSLIP',
          entityId: payslip.id,
          details: { employeeId, month, year, netSalary }
        }
      });

      logger.info(`Payslip created for employee ${employee.employeeCode} (${month}/${year}): Net ₹${netSalary}`);
    }
    return payslip;
  }

  static async findAll(filters: { page?: number; limit?: number; month?: number; year?: number; employeeId?: string; department?: string; status?: string }) {
    const { page = 1, limit = 10, month, year, employeeId, department, status } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (month) {
      where.month = month;
    }

    if (year) {
      where.year = year;
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (department) {
      where.employee = { department };
    }

    if (status) {
      where.status = status;
    }

    const [records, total] = await Promise.all([
      prisma.payslip.findMany({
        where,
        skip,
        take: limit,
        include: { employee: true },
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }]
      }),
      prisma.payslip.count({ where })
    ]);

    return {
      payslips: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async findOne(id: string) {
    const payslip = await prisma.payslip.findUnique({
      where: { id },
      include: { employee: true }
    });

    if (!payslip) {
      throw new AppError('Payslip not found', 404);
    }

    return payslip;
  }

  private static resolveFields(data: any, existing: any) {
    const pick = (key: string) => (data[key] !== undefined ? data[key] : existing[key]);

    return {
      month: data.month || existing.month,
      year: data.year || existing.year,
      basicSalary: pick('basicSalary'),
      hra: pick('hra'),
      da: pick('da'),
      medicalAllowance: pick('medicalAllowance'),
      travelAllowance: pick('travelAllowance'),
      specialAllowance: pick('specialAllowance'),
      otherAllowances: pick('otherAllowances'),
      bonus: pick('bonus'),
      incentive: pick('incentive'),
      overtimePay: pick('overtimePay'),
      leaveDays: pick('leaveDays'),
      lopDays: pick('lopDays'),
      incomeTax: pick('incomeTax'),
      leaveDeduction: pick('leaveDeduction'),
      lateDeduction: pick('lateDeduction'),
      otherDeductions: pick('otherDeductions'),
      advanceDeduction: pick('advanceDeduction')
    };
  }

  static async update(id: string, data: any, adminId: string) {
    const existing = await this.findOne(id);

    const {
      month, year, basicSalary, hra, da, medicalAllowance, travelAllowance, specialAllowance, otherAllowances,
      bonus, incentive, overtimePay, leaveDays, lopDays, incomeTax, leaveDeduction, lateDeduction, otherDeductions, advanceDeduction
    } = PayslipService.resolveFields(data, existing);

    const workingDaysInfo = calculateWorkingDays(year, month);
    const workingDays = workingDaysInfo.workingDays;
    const totalDays = workingDaysInfo.totalDays;
    const weekendDays = workingDaysInfo.weekendDays;
    const payableDays = workingDays - leaveDays - lopDays;

    const calculatedGross = calculateGrossSalary(basicSalary, hra, da, medicalAllowance, travelAllowance, specialAllowance, otherAllowances);
    const totalEarnings = roundOffAmount(calculatedGross + bonus + incentive + overtimePay);

    const calculatedPF = data.pfDeduction !== undefined ? data.pfDeduction : calculatePFDeduction(basicSalary);
    const calculatedESI = data.esiDeduction !== undefined ? data.esiDeduction : calculateESIDeduction(calculatedGross);
    const calculatedPT = data.professionalTax !== undefined ? data.professionalTax : calculateProfessionalTax(calculatedGross);

    const totalDeductions = roundOffAmount(calculatedPF + calculatedESI + calculatedPT + incomeTax + leaveDeduction + lateDeduction + otherDeductions + advanceDeduction);
    const netSalary = roundOffAmount(totalEarnings - totalDeductions);
    const amountInWords = convertToWords(netSalary);

    const updated = await prisma.payslip.update({
      where: { id },
      data: {
        month,
        year,
        totalDays,
        workingDays,
        presentDays: workingDays - (leaveDays + lopDays),
        absentDays: leaveDays + lopDays,
        leaveDays,
        weekendDays,
        lopDays,
        payableDays,
        basicSalary,
        hra,
        da,
        medicalAllowance,
        travelAllowance,
        specialAllowance,
        otherAllowances,
        bonus,
        incentive,
        overtimePay,
        totalEarnings,
        pfDeduction: calculatedPF,
        esiDeduction: calculatedESI,
        professionalTax: calculatedPT,
        incomeTax,
        leaveDeduction,
        lateDeduction,
        otherDeductions,
        advanceDeduction,
        totalDeductions,
        grossSalary: calculatedGross,
        netSalary,
        amountInWords,
        status: data.status || existing.status
      },
      include: { employee: true }
    });

    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'PAYSLIP_UPDATE',
        entityType: 'PAYSLIP',
        entityId: id,
        details: { changes: data, netSalary }
      }
    });

    logger.info(`Payslip updated: ${id}, Net ₹${netSalary}`);
    return updated;
  }

  static async delete(id: string, adminId: string) {
    const payslip = await this.findOne(id);

    await prisma.payslip.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'PAYSLIP_DELETE',
        entityType: 'PAYSLIP',
        entityId: id,
        details: { employeeId: payslip.employeeId, month: payslip.month, year: payslip.year }
      }
    });

    logger.info(`Payslip deleted: ${id}`);
    return { message: 'Payslip deleted successfully' };
  }

  static async getReviewData(id: string) {
    const payslip = await prisma.payslip.findUnique({
      where: { id },
      include: { employee: true }
    });

    if (!payslip) {
      throw new AppError('Payslip not found', 404);
    }

    const companyProfile = await prisma.companyProfile.findFirst();

    return {
      payslip,
      employee: payslip.employee,
      companyProfile
    };
  }

  static async generatePayslip(id: string, adminId: string) {
    const payslip = await prisma.payslip.findUnique({
      where: { id },
      include: { employee: true }
    });

    if (!payslip) {
      throw new AppError('Payslip not found', 404);
    }

    const result = await PdfService.generatePayslip(payslip.id);
    const pdfPath = result.filePath;
    const pdfSize = result.fileSize;

    const now = new Date();

    const existingGenerated = await prisma.generatedPayslip.findUnique({
      where: { payslipId: id }
    });

    if (existingGenerated) {
      await prisma.generatedPayslip.update({
        where: { payslipId: id },
        data: {
          pdfPath,
          pdfSize,
          generatedAt: now,
          downloadCount: { increment: 1 },
          lastDownloadAt: now
        }
      });
    } else {
      await prisma.generatedPayslip.create({
        data: {
          payslipId: id,
          employeeId: payslip.employeeId,
          month: payslip.month,
          year: payslip.year,
          pdfPath,
          pdfSize,
          generatedBy: adminId
        }
      });
    }

    await prisma.payslip.update({
      where: { id },
      data: {
        status: 'GENERATED',
        pdfPath,
        pdfSize,
        generatedAt: now,
        generatedBy: adminId
      }
    });

    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'PAYSLIP_GENERATE',
        entityType: 'PAYSLIP',
        entityId: id,
        details: { employeeId: payslip.employeeId, month: payslip.month, year: payslip.year, pdfPath }
      }
    });

    logger.info(`Payslip generated: ${id}, PDF: ${pdfPath}`);
    return { pdfPath, pdfSize, generatedAt: now };
  }

  static async getPayslipStats() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [total, currentMonthTotal, generated, pending] = await Promise.all([
      prisma.payslip.count(),
      prisma.payslip.count({ where: { month: currentMonth, year: currentYear } }),
      prisma.payslip.count({ where: { status: 'GENERATED' } }),
      prisma.payslip.count({ where: { status: 'DRAFT' } })
    ]);

    return {
      total,
      currentMonth: currentMonthTotal,
      generated,
      pending
    };
  }
}


