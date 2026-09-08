import fs from 'fs';
import path from 'path';
import { prisma } from '../config/database';
import { AppError } from '../utils/error-handler';
import { logger } from '../utils/logger';
import { JibbleService } from './jibble/jibble.service';
import { JibbleDailyAttendance } from './jibble/jibble.types';
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

const STANDARD_DAILY_HOURS = 8;

interface DayRow {
  date: string;
  weekday: string;
  isWeekend: boolean;
  clockIn: string | null;
  clockOut: string | null;
  workedHours: number;
  overtimeHours: number;
  status: 'PRESENT' | 'HALF_DAY' | 'ABSENT' | 'WEEKEND';
}

interface AttendanceSummary {
  totalDays: number;
  workingDays: number;
  weekendDays: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  leaveDays: number;
  holidayDays: number;
  lopDays: number;
  payableDays: number;
  totalWorkedHours: number;
  totalOvertimeHours: number;
}

interface EmployeeAttendance {
  attendance: AttendanceSummary;
  days: DayRow[];
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatClockTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export class JibblePayslipService {
  private static computeAttendance(month: number, year: number, daily: Map<string, JibbleDailyAttendance>): EmployeeAttendance {
    const wd = calculateWorkingDays(year, month);
    const days: DayRow[] = [];
    let presentDays = 0;
    let halfDays = 0;
    let absentDays = 0;
    let totalWorkedHours = 0;
    let totalOvertimeHours = 0;

    for (let day = 1; day <= wd.totalDays; day++) {
      const date = new Date(year, month - 1, day);
      const dow = date.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const dateStr = toDateStr(year, month, day);
      const rec = daily.get(dateStr);

      const worked = rec?.workedHours || 0;
      const overtime = rec?.overtimeHours || 0;
      totalWorkedHours += worked;
      totalOvertimeHours += overtime;

      let status: DayRow['status'];
      if (isWeekend) {
        status = 'WEEKEND';
      } else if (!rec || worked <= 0) {
        status = 'ABSENT';
        absentDays++;
      } else if (worked >= STANDARD_DAILY_HOURS) {
        status = 'PRESENT';
        presentDays++;
      } else {
        status = 'HALF_DAY';
        halfDays++;
      }

      days.push({
        date: dateStr,
        weekday: WEEKDAY_LABELS[dow],
        isWeekend,
        clockIn: formatClockTime(rec?.clockIn),
        clockOut: formatClockTime(rec?.clockOut),
        workedHours: Math.round(worked * 100) / 100,
        overtimeHours: Math.round(overtime * 100) / 100,
        status,
      });
    }

    const payableDays = presentDays + halfDays * 0.5;

    return {
      attendance: {
        totalDays: wd.totalDays,
        workingDays: wd.workingDays,
        weekendDays: wd.weekendDays,
        presentDays,
        halfDays,
        absentDays,
        leaveDays: 0,
        holidayDays: 0,
        lopDays: absentDays,
        payableDays: Math.round(payableDays * 100) / 100,
        totalWorkedHours: Math.round(totalWorkedHours * 100) / 100,
        totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
      },
      days,
    };
  }

  private static computeSalary(employee: any, attendance: AttendanceSummary) {
    const workedRatio = attendance.workingDays > 0 ? attendance.payableDays / attendance.workingDays : 0;
    const prorate = (n: number) => Math.round((n || 0) * workedRatio);

    const basicSalary = prorate(employee.basicSalary);
    const hra = prorate(employee.hra);
    const da = prorate(employee.da);
    const medicalAllowance = prorate(employee.medicalAllowance);
    const travelAllowance = prorate(employee.travelAllowance);
    const specialAllowance = prorate(employee.specialAllowance);
    const otherAllowances = prorate(employee.otherAllowances);

    const grossSalary = calculateGrossSalary(
      basicSalary, hra, da, medicalAllowance, travelAllowance, specialAllowance, otherAllowances
    );

    const bonus = 0;
    const incentive = 0;
    const overtimePay = 0;
    const totalEarnings = roundOffAmount(grossSalary + bonus + incentive + overtimePay);

    const pfDeduction = roundOffAmount(calculatePFDeduction(basicSalary));
    const esiDeduction = roundOffAmount(calculateESIDeduction(grossSalary));
    const professionalTax = calculateProfessionalTax(grossSalary);
    const totalDeductions = roundOffAmount(pfDeduction + esiDeduction + professionalTax);
    const netSalary = roundOffAmount(Math.max(0, totalEarnings - totalDeductions));
    const amountInWords = convertToWords(netSalary);

    return {
      basicSalary,
      hra,
      da,
      medicalAllowance,
      travelAllowance,
      specialAllowance,
      otherAllowances,
      grossSalary,
      bonus,
      incentive,
      overtimePay,
      totalEarnings,
      pfDeduction,
      esiDeduction,
      professionalTax,
      totalDeductions,
      netSalary,
      amountInWords,
    };
  }

  static async preview(month: number, year: number) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const totalDays = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(totalDays).padStart(2, '0')}`;

    const [employees, dailySummaries] = await Promise.all([
      prisma.employee.findMany({
        where: { jibbleEmployeeId: { not: null } },
      }),
      JibbleService.getLiveAttendance(startDate, endDate),
    ]);

    const byPerson = new Map<string, Map<string, JibbleDailyAttendance>>();
    for (const s of dailySummaries) {
      if (!byPerson.has(s.personId)) {
        byPerson.set(s.personId, new Map());
      }
      byPerson.get(s.personId)!.set(s.date, s);
    }

    const employeesResult = employees.map((employee) => {
      const dailyMap = byPerson.get(employee.jibbleEmployeeId!) || new Map();
      const computed = this.computeAttendance(month, year, dailyMap);
      const salary = this.computeSalary(employee, computed.attendance);
      return {
        employee: {
          id: employee.id,
          employeeCode: employee.employeeCode,
          employeeName: employee.employeeName,
          email: employee.email,
          department: employee.department,
          designation: employee.designation,
        },
        ...computed.attendance,
        totalWorkedHours: computed.attendance.totalWorkedHours,
        totalOvertimeHours: computed.attendance.totalOvertimeHours,
        salary,
        days: computed.days,
      };
    });

    const totals = employeesResult.reduce(
      (acc, e) => {
        acc.presentDays += e.presentDays;
        acc.halfDays += e.halfDays;
        acc.absentDays += e.absentDays;
        acc.payableDays += e.payableDays;
        acc.totalWorkedHours += e.totalWorkedHours;
        acc.netSalary += e.salary.netSalary;
        return acc;
      },
      { presentDays: 0, halfDays: 0, absentDays: 0, payableDays: 0, totalWorkedHours: 0, netSalary: 0 }
    );

    return {
      month,
      year,
      employees: employeesResult,
      totals,
      meta: {
        startDate,
        endDate,
        totalEmployees: employeesResult.length,
        jibbleRecords: dailySummaries.length,
      },
    };
  }

  static async findAll(filters: { page?: number; limit?: number; month?: number; year?: number; employeeId?: string; department?: string; status?: string }) {
    const { page = 1, limit = 10, month, year, employeeId, department, status } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (month) where.month = Number(month);
    if (year) where.year = Number(year);
    if (employeeId) where.employeeId = employeeId;
    if (department) where.employee = { department };
    if (status) where.status = status;

    const [records, total] = await Promise.all([
      prisma.jibblePayslip.findMany({
        where,
        skip,
        take: limit,
        include: { employee: true },
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.jibblePayslip.count({ where }),
    ]);

    return {
      payslips: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async findOne(id: string) {
    const payslip = await prisma.jibblePayslip.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!payslip) {
      throw new AppError('Jibble payslip not found', 404);
    }

    return payslip;
  }

  static async save(month: number, year: number, adminId: string) {
    const { employees } = await this.preview(month, year);
    const saved: any[] = [];

    for (const entry of employees) {
      const sal = entry.salary;
      const att = {
        totalDays: entry.totalDays,
        workingDays: entry.workingDays,
        presentDays: entry.presentDays,
        halfDays: entry.halfDays,
        absentDays: entry.absentDays,
        leaveDays: entry.leaveDays,
        holidayDays: entry.holidayDays,
        weekendDays: entry.weekendDays,
        lopDays: entry.lopDays,
        payableDays: entry.payableDays,
        totalWorkedHours: entry.totalWorkedHours,
        totalOvertimeHours: entry.totalOvertimeHours,
      };

      const data: any = {
        employeeId: entry.employee.id,
        month,
        year,
        ...att,
        ...sal,
        status: 'DRAFT',
      };

      const existing = await prisma.jibblePayslip.findUnique({
        where: { employeeId_month_year: { employeeId: entry.employee.id, month, year } },
      });

      let record: any;
      if (existing) {
        record = await prisma.jibblePayslip.update({
          where: { id: existing.id },
          data: {
            ...data,
            status: existing.status,
            pdfPath: existing.pdfPath,
            pdfSize: existing.pdfSize,
            generatedAt: existing.generatedAt,
            generatedBy: existing.generatedBy,
          },
          include: { employee: true },
        });
      } else {
        record = await prisma.jibblePayslip.create({
          data,
          include: { employee: true },
        });
      }
      saved.push(record);
    }

    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'JIBBLE_PAYSLIP_SAVE',
        entityType: 'JIBBLE_PAYSLIP',
        entityId: null,
        details: { month, year, count: saved.length },
      },
    });

    logger.info(`Saved ${saved.length} Jibble payslips for ${month}/${year}`);
    return { payslips: saved, count: saved.length, month, year };
  }

  static async update(id: string, data: any, adminId: string) {
    const existing: any = await this.findOne(id);
    const pick = (key: string) => (data[key] !== undefined ? data[key] : existing[key]);

    const month = data.month || existing.month;
    const year = data.year || existing.year;

    const totalDays = pick('totalDays');
    const workingDays = pick('workingDays');
    const presentDays = pick('presentDays');
    const halfDays = pick('halfDays');
    const absentDays = pick('absentDays');
    const leaveDays = pick('leaveDays');
    const holidayDays = pick('holidayDays');
    const weekendDays = pick('weekendDays');
    const lopDays = pick('lopDays');
    const payableDays = pick('payableDays');
    const totalWorkedHours = pick('totalWorkedHours');
    const totalOvertimeHours = pick('totalOvertimeHours');

    const basicSalary = pick('basicSalary');
    const hra = pick('hra');
    const da = pick('da');
    const medicalAllowance = pick('medicalAllowance');
    const travelAllowance = pick('travelAllowance');
    const specialAllowance = pick('specialAllowance');
    const otherAllowances = pick('otherAllowances');
    const bonus = pick('bonus');
    const incentive = pick('incentive');
    const overtimePay = pick('overtimePay');
    const incomeTax = pick('incomeTax');
    const leaveDeduction = pick('leaveDeduction');
    const lateDeduction = pick('lateDeduction');
    const otherDeductions = pick('otherDeductions');
    const advanceDeduction = pick('advanceDeduction');

    const grosSalary = calculateGrossSalary(
      basicSalary, hra, da, medicalAllowance, travelAllowance, specialAllowance, otherAllowances
    );
    const totalEarnings = roundOffAmount(grosSalary + bonus + incentive + overtimePay);

    const calculatedPF = data.pfDeduction !== undefined ? data.pfDeduction : calculatePFDeduction(basicSalary);
    const calculatedESI = data.esiDeduction !== undefined ? data.esiDeduction : calculateESIDeduction(grosSalary);
    const calculatedPT = data.professionalTax !== undefined ? data.professionalTax : calculateProfessionalTax(grosSalary);

    const totalDeductions = roundOffAmount(
      calculatedPF + calculatedESI + calculatedPT + incomeTax + leaveDeduction + lateDeduction + otherDeductions + advanceDeduction
    );
    const netSalary = roundOffAmount(Math.max(0, totalEarnings - totalDeductions));
    const amountInWords = convertToWords(netSalary);

    const updated = await prisma.jibblePayslip.update({
      where: { id },
      data: {
        month,
        year,
        totalDays,
        workingDays,
        presentDays,
        halfDays,
        absentDays,
        leaveDays,
        holidayDays,
        weekendDays,
        lopDays,
        payableDays,
        totalWorkedHours,
        totalOvertimeHours,
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
        grossSalary: grosSalary,
        netSalary,
        amountInWords,
        status: data.status || existing.status,
      },
      include: { employee: true },
    });

    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'JIBBLE_PAYSLIP_UPDATE',
        entityType: 'JIBBLE_PAYSLIP',
        entityId: id,
        details: { changes: data, netSalary },
      },
    });

    logger.info(`Jibble payslip updated: ${id}, Net ₹${netSalary}`);
    return updated;
  }

  static async delete(id: string, adminId: string) {
    const payslip = await this.findOne(id);

    await prisma.jibblePayslip.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'JIBBLE_PAYSLIP_DELETE',
        entityType: 'JIBBLE_PAYSLIP',
        entityId: id,
        details: { employeeId: payslip.employeeId, month: payslip.month, year: payslip.year },
      },
    });

    logger.info(`Jibble payslip deleted: ${id}`);
    return { message: 'Jibble payslip deleted successfully' };
  }

  static async getReviewData(id: string) {
    const payslip = await this.findOne(id);
    const companyProfile = await prisma.companyProfile.findFirst();

    return {
      payslip,
      employee: payslip.employee,
      companyProfile,
    };
  }

  static async generatePayslip(id: string, adminId: string) {
    const payslip = await this.findOne(id);
    const companyProfile = await prisma.companyProfile.findFirst();

    const result = await PdfService.generatePayslipFromData(payslip, payslip.employee, companyProfile);
    const now = new Date();

    await prisma.jibblePayslip.update({
      where: { id },
      data: {
        status: 'GENERATED',
        pdfPath: result.filePath,
        pdfSize: result.fileSize,
        generatedAt: now,
        generatedBy: adminId,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'JIBBLE_PAYSLIP_GENERATE',
        entityType: 'JIBBLE_PAYSLIP',
        entityId: id,
        details: { employeeId: payslip.employeeId, month: payslip.month, year: payslip.year, pdfPath: result.filePath },
      },
    });

    logger.info(`Jibble payslip generated: ${id}, PDF: ${result.filePath}`);
    return { pdfPath: result.filePath, pdfSize: result.fileSize, generatedAt: now };
  }

  static async downloadPayslip(id: string, adminId: string) {
    let payslip = await this.findOne(id);

    if (!payslip.pdfPath || !fs.existsSync(path.resolve(payslip.pdfPath))) {
      await this.generatePayslip(id, adminId);
      payslip = await this.findOne(id);
      if (!payslip.pdfPath) {
        throw new AppError('Failed to generate PDF for download', 500);
      }
    }

    return payslip.pdfPath;
  }
}