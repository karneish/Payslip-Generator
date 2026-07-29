import { prisma } from '../config/database';
import { AppError } from '../utils/error-handler';
import { logger } from '../utils/logger';
import { randomBytes } from 'crypto';

export class EmployeeService {
  private static async generateUniqueAadhaar(): Promise<string> {
    let aadharNumber: string;
    for (let attempts = 0; attempts < 30; attempts++) {
      aadharNumber = Array.from(randomBytes(8)).map(b => b.toString().padStart(2, '0')).join('').substring(0, 12);
      while (aadharNumber.length < 12) aadharNumber = '0' + aadharNumber;
      const existing = await prisma.employee.findUnique({ where: { aadharNumber } }).catch(() => null);
      if (!existing) return aadharNumber;
    }
    return `ADH${Date.now()}${Math.random().toString(36).substring(2, 8)}`.substring(0, 12);
  }

  static async create(data: any, adminId: string) {
    const {
      employeeCode,
      employeeName,
      email,
      phoneNumber = '',
      department = 'General',
      designation = 'Employee',
      panNumber = '',
      aadharNumber: inputAadhaar = '',
      uanNumber = '',
      pfNumber = '',
      esiNumber = '',
      bankName = '',
      bankAccountNumber = '',
      ifscCode = '',
      joiningDate = new Date().toISOString(),
      employmentStatus = 'Active',
      basicSalary = 0,
      hra = 0,
      da = 0,
      medicalAllowance = 0,
      travelAllowance = 0,
      specialAllowance = 0,
      otherAllowances = 0
    } = data;

    if (!employeeCode || !employeeName || !email) {
      throw new AppError('Employee code, name, and email are required', 400);
    }

    // Check for duplicates by code and email first (clear error messages)
    const existingByCode = await prisma.employee.findUnique({ where: { employeeCode } });
    if (existingByCode) {
      throw new AppError(`Employee with code '${employeeCode}' already exists`, 409);
    }

    const existingByEmail = await prisma.employee.findFirst({ where: { email } });
    if (existingByEmail) {
      throw new AppError(`Employee with email '${email}' already exists`, 409);
    }

    // Generate unique aadhaar if not provided or empty
    let aadharNumber = inputAadhaar;
    if (!aadharNumber || aadharNumber.trim() === '') {
      aadharNumber = await this.generateUniqueAadhaar();
    } else {
      const existingByAadhaar = await prisma.employee.findFirst({ where: { aadharNumber } });
      if (existingByAadhaar) {
        throw new AppError(`Employee with Aadhaar '${aadharNumber}' already exists`, 409);
      }
    }

    const grossSalary = basicSalary + hra + da + medicalAllowance + travelAllowance + specialAllowance + otherAllowances;

    let employee: any;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        if (attempt > 0) {
          aadharNumber = await this.generateUniqueAadhaar();
        }
        employee = await prisma.employee.create({
          data: {
            employeeCode,
            employeeName,
            email,
            phoneNumber,
            department,
            designation,
            panNumber,
            aadharNumber,
            uanNumber,
            pfNumber,
            esiNumber,
            bankName,
            bankAccountNumber,
            ifscCode,
            joiningDate: new Date(joiningDate),
            employmentStatus,
            basicSalary,
            hra,
            da,
            medicalAllowance,
            travelAllowance,
            specialAllowance,
            otherAllowances,
            grossSalary,
            netSalary: grossSalary
          }
        });
        break;
      } catch (err: any) {
        if (err.code === 'P2002' && attempt < 4) {
          aadharNumber = await this.generateUniqueAadhaar();
          continue;
        }
        throw err;
      }
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'EMPLOYEE_CREATE',
        entityType: 'EMPLOYEE',
        entityId: employee.id,
        details: { employeeCode, email }
      }
    });

    logger.info(`Employee created: ${employeeCode}`);
    return employee;
  }

  static async findAll(filters: any) {
    const { page = 1, limit = 10, search, department, status } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { employeeName: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (department) {
      where.department = department;
    }

    if (status) {
      where.employmentStatus = { equals: status, mode: 'insensitive' };
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { employeeName: 'asc' }
      }),
      prisma.employee.count({ where })
    ]);

    return {
      employees,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async findOne(id: string) {
    const employee = await prisma.employee.findUnique({
      where: { id }
    });

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    return employee;
  }

  static async update(id: string, data: any, adminId: string) {
    const employee = await this.findOne(id);

    const {
      basicSalary,
      hra,
      da,
      medicalAllowance,
      travelAllowance,
      specialAllowance,
      otherAllowances
    } = data;

    const grossSalary = (basicSalary ?? employee.basicSalary) + 
                        (hra ?? employee.hra) + 
                        (da ?? employee.da) + 
                        (medicalAllowance ?? employee.medicalAllowance) + 
                        (travelAllowance ?? employee.travelAllowance) + 
                        (specialAllowance ?? employee.specialAllowance) + 
                        (otherAllowances ?? employee.otherAllowances);

    const {
      employeeCode, employeeName, email, phoneNumber, department, designation,
      panNumber, aadharNumber, uanNumber, pfNumber, esiNumber,
      bankName, bankAccountNumber, ifscCode, joiningDate,
      employmentStatus, jibbleEmployeeId, jibbleUserId, syncStatus, lastSyncTime,
      attendanceStatus
    } = data;

    const updateData: any = {
      ...(employeeCode !== undefined && { employeeCode }),
      ...(employeeName !== undefined && { employeeName }),
      ...(email !== undefined && { email }),
      ...(phoneNumber !== undefined && { phoneNumber }),
      ...(department !== undefined && { department }),
      ...(designation !== undefined && { designation }),
      ...(panNumber !== undefined && { panNumber }),
      ...(aadharNumber !== undefined && { aadharNumber }),
      ...(uanNumber !== undefined && { uanNumber }),
      ...(pfNumber !== undefined && { pfNumber }),
      ...(esiNumber !== undefined && { esiNumber }),
      ...(bankName !== undefined && { bankName }),
      ...(bankAccountNumber !== undefined && { bankAccountNumber }),
      ...(ifscCode !== undefined && { ifscCode }),
      ...(joiningDate !== undefined && { joiningDate: new Date(joiningDate) }),
      ...(employmentStatus !== undefined && { employmentStatus }),
      ...(jibbleEmployeeId !== undefined && { jibbleEmployeeId }),
      ...(jibbleUserId !== undefined && { jibbleUserId }),
      ...(syncStatus !== undefined && { syncStatus }),
      ...(lastSyncTime !== undefined && { lastSyncTime: new Date(lastSyncTime) }),
      ...(attendanceStatus !== undefined && { attendanceStatus }),
      ...(basicSalary !== undefined && { basicSalary }),
      ...(hra !== undefined && { hra }),
      ...(da !== undefined && { da }),
      ...(medicalAllowance !== undefined && { medicalAllowance }),
      ...(travelAllowance !== undefined && { travelAllowance }),
      ...(specialAllowance !== undefined && { specialAllowance }),
      ...(otherAllowances !== undefined && { otherAllowances }),
      grossSalary,
      netSalary: grossSalary
    };

    const updated = await prisma.employee.update({
      where: { id },
      data: updateData
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'EMPLOYEE_UPDATE',
        entityType: 'EMPLOYEE',
        entityId: id,
        details: { changes: data }
      }
    });

    logger.info(`Employee updated: ${employee.employeeCode}`);
    return updated;
  }

  static async getDependencies(id: string) {
    await this.findOne(id);

    const [payslips, attendance, attendanceSummaries, emailLogs, generatedPayslips, salaryHistory, parsedSalaryData] = await Promise.all([
      prisma.payslip.count({ where: { employeeId: id } }),
      prisma.attendance.count({ where: { employeeId: id } }),
      prisma.attendanceSummary.count({ where: { employeeId: id } }),
      prisma.emailLog.count({ where: { employeeId: id } }),
      prisma.generatedPayslip.count({ where: { employeeId: id } }),
      prisma.salaryHistory.count({ where: { employeeId: id } }),
      prisma.parsedSalaryData.count({ where: { employeeId: id } }),
    ]);

    return {
      payslips,
      attendance,
      attendanceSummaries,
      emailLogs,
      generatedPayslips,
      salaryHistory,
      parsedSalaryData,
      total: payslips + attendance + attendanceSummaries + emailLogs + generatedPayslips + salaryHistory + parsedSalaryData,
    };
  }

  static async delete(id: string, adminId: string, force: boolean = false) {
    const employee = await this.findOne(id);

    const deps = await this.getDependencies(id);
    if (deps.total > 0) {
      if (!force) {
        const details: string[] = [];
        if (deps.payslips > 0) details.push(`${deps.payslips} payslip(s)`);
        if (deps.attendance > 0) details.push(`${deps.attendance} attendance record(s)`);
        if (deps.attendanceSummaries > 0) details.push(`${deps.attendanceSummaries} attendance summary(ies)`);
        if (deps.emailLogs > 0) details.push(`${deps.emailLogs} email log(s)`);
        if (deps.generatedPayslips > 0) details.push(`${deps.generatedPayslips} generated payslip(s)`);
        if (deps.salaryHistory > 0) details.push(`${deps.salaryHistory} salary history record(s)`);
        if (deps.parsedSalaryData > 0) details.push(`${deps.parsedSalaryData} parsed salary record(s)`);
        throw new AppError(
          `Cannot delete employee '${employee.employeeName}' because they have related records: ${details.join(', ')}. Please delete these records first, or use force=true to cascade delete.`,
          409
        );
      }

      await prisma.$transaction([
        prisma.generatedPayslip.deleteMany({ where: { employeeId: id } }),
        prisma.emailLog.deleteMany({ where: { employeeId: id } }),
        prisma.parsedSalaryData.deleteMany({ where: { employeeId: id } }),
        prisma.salaryHistory.deleteMany({ where: { employeeId: id } }),
        prisma.payslip.deleteMany({ where: { employeeId: id } }),
        prisma.attendanceSummary.deleteMany({ where: { employeeId: id } }),
        prisma.attendance.deleteMany({ where: { employeeId: id } }),
      ]);

      logger.info(`Force-deleted child records for employee ${employee.employeeCode}`);
    }

    await prisma.employee.delete({
      where: { id }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'EMPLOYEE_DELETE',
        entityType: 'EMPLOYEE',
        entityId: id,
        details: { employeeCode: employee.employeeCode, force }
      }
    });

    logger.info(`Employee deleted: ${employee.employeeCode}${force ? ' (force cascade)' : ''}`);
  }

  static async importEmployees(employees: any[], adminId: string) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    for (const emp of employees) {
      try {
        await this.create(emp, adminId);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          employee: emp.employeeName || 'Unknown',
          error: error.message
        });
      }
    }

    return results;
  }

  static async findOrCreateFromUpload(name: string, salaryData: any, adminId: string) {
    const existing = await prisma.employee.findFirst({
      where: { employeeName: { equals: name, mode: 'insensitive' } }
    });
    if (existing) return existing;

    const count = await prisma.employee.count();
    let num = count + 1;
    let employeeCode = `SC${String(num).padStart(3, '0')}`;
    while (await prisma.employee.findUnique({ where: { employeeCode } })) {
      num++;
      employeeCode = `SC${String(num).padStart(3, '0')}`;
    }

    const sanitized = name.toLowerCase().replace(/[^a-z]/g, '').substring(0, 20);
    let email = `${sanitized}@shinecraft.local`;
    let emailSuffix = 0;
    while (await prisma.employee.findUnique({ where: { email } })) {
      emailSuffix++;
      email = `${sanitized}${emailSuffix}@shinecraft.local`;
    }

    let aadharNumber = await this.generateUniqueAadhaar();

    const toNum = (v: any): number => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') { const n = parseFloat(v.replace(/[₹,]/g, '')); return isNaN(n) ? 0 : n; }
      return 0;
    };
    const basicSalary = toNum(salaryData?.basicSalary || salaryData?.['Basic Salary'] || 0);
    const netSalary = toNum(salaryData?.netSalary || salaryData?.['Net Salary'] || 0);

    let employee: any;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        if (attempt > 0) {
          aadharNumber = await this.generateUniqueAadhaar();
          employeeCode = `SC${String(Date.now())}${attempt}`;
        }
        employee = await prisma.employee.create({
          data: {
            employeeCode,
            employeeName: name,
            email,
            phoneNumber: '',
            department: 'General',
            designation: 'Employee',
            panNumber: '',
            aadharNumber,
            bankName: '',
            bankAccountNumber: '',
            ifscCode: '',
            joiningDate: new Date(),
            employmentStatus: 'Active',
            basicSalary,
            hra: 0,
            da: 0,
            medicalAllowance: 0,
            travelAllowance: 0,
            specialAllowance: 0,
            otherAllowances: 0,
            grossSalary: basicSalary,
            netSalary: netSalary || basicSalary
          }
        });
        break;
      } catch (err: any) {
        if (err.code === 'P2002' && attempt < 4) {
          aadharNumber = await this.generateUniqueAadhaar();
          continue;
        }
        throw err;
      }
    }

    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'EMPLOYEE_CREATE',
        entityType: 'EMPLOYEE',
        entityId: employee.id,
        details: { employeeCode, email, source: 'UPLOAD_AUTO_CREATE' }
      }
    });

    logger.info(`Employee auto-created from upload: ${employeeCode} (${name})`);
    return employee;
  }

  static async getSalaryHistory(employeeId: string) {
    await this.findOne(employeeId);

    return prisma.salaryHistory.findMany({
      where: { employeeId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });
  }

  static async addSalaryHistory(employeeId: string, data: { month: number; year: number; basicSalary: number; hra?: number; da?: number; medicalAllowance?: number; travelAllowance?: number; specialAllowance?: number; otherAllowances?: number; grossSalary?: number; netSalary?: number }) {
    await this.findOne(employeeId);

    const gross = data.grossSalary || (
      data.basicSalary +
      (data.hra || 0) +
      (data.da || 0) +
      (data.medicalAllowance || 0) +
      (data.travelAllowance || 0) +
      (data.specialAllowance || 0) +
      (data.otherAllowances || 0)
    );

    return prisma.salaryHistory.create({
      data: {
        employeeId,
        month: data.month,
        year: data.year,
        basicSalary: data.basicSalary,
        hra: data.hra || 0,
        da: data.da || 0,
        medicalAllowance: data.medicalAllowance || 0,
        travelAllowance: data.travelAllowance || 0,
        specialAllowance: data.specialAllowance || 0,
        otherAllowances: data.otherAllowances || 0,
        grossSalary: gross,
        netSalary: data.netSalary || gross
      }
    });
  }

  static async exportEmployees(format: string) {
    const employees = await prisma.employee.findMany({
      orderBy: { employeeName: 'asc' }
    });

    // Format for export
    const data = employees.map(emp => ({
      'Employee Code': emp.employeeCode,
      'Employee Name': emp.employeeName,
      'Email': emp.email,
      'Phone': emp.phoneNumber,
      'Department': emp.department,
      'Designation': emp.designation,
      'PAN': emp.panNumber,
      'Aadhar': emp.aadharNumber,
      'Bank Account': emp.bankAccountNumber,
      'IFSC': emp.ifscCode,
      'Joining Date': emp.joiningDate,
      'Status': emp.employmentStatus,
      'Basic Salary': emp.basicSalary,
      'HRA': emp.hra,
      'DA': emp.da,
      'Gross Salary': emp.grossSalary
    }));

    return data;
  }
}