import { prisma } from '../config/database';
import { AppError } from '../utils/error-handler';
import { logger } from '../utils/logger';
import { calculateWorkingDays } from '../utils/salary-calculator';
import { getMonthRange } from '../utils/date-utils';
import { JibbleService } from './jibble/jibble.service';

export class AttendanceService {
  static async create(data: any, adminId: string) {
    const { employeeId, date, clockInTime, clockOutTime, status, isHoliday, isWeekend, isLeave, leaveType, notes, breakDuration, totalWorkedHours, overtimeHours } = data;

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    const attendanceDate = new Date(date);
    const existing = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: {
          gte: new Date(attendanceDate.getFullYear(), attendanceDate.getMonth(), attendanceDate.getDate()),
          lt: new Date(attendanceDate.getFullYear(), attendanceDate.getMonth(), attendanceDate.getDate() + 1)
        }
      }
    });

    if (existing) {
      throw new AppError('Attendance record already exists for this employee on this date', 409);
    }

    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        date: attendanceDate,
        clockInTime: clockInTime ? new Date(clockInTime) : null,
        clockOutTime: clockOutTime ? new Date(clockOutTime) : null,
        breakDuration: breakDuration || 0,
        totalWorkedHours: totalWorkedHours || 0,
        overtimeHours: overtimeHours || 0,
        status: status || 'PRESENT',
        isHoliday: isHoliday || false,
        isWeekend: isWeekend || false,
        isLeave: isLeave || false,
        leaveType: leaveType || null,
        notes: notes || null
      },
      include: { employee: true }
    });

    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'ATTENDANCE_CREATE',
        entityType: 'ATTENDANCE',
        entityId: attendance.id,
        details: { employeeId, date, status: attendance.status }
      }
    });

    logger.info(`Attendance created for employee ${employee.employeeCode} on ${date}`);
    return attendance;
  }

  static async findAll(filters: { page?: number; limit?: number; employeeId?: string; month?: number; year?: number; status?: string }) {
    const { page = 1, limit = 10, employeeId, month, year, status } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (month && year) {
      const { startDate, endDate } = getMonthRange(month, year);
      where.date = { gte: startDate, lte: endDate };
    }

    if (status) {
      where.status = status;
    }

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        include: { employee: true },
        orderBy: { date: 'desc' }
      }),
      prisma.attendance.count({ where })
    ]);

    return {
      attendance: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async findOne(id: string) {
    const record = await prisma.attendance.findUnique({
      where: { id },
      include: { employee: true }
    });

    if (!record) {
      throw new AppError('Attendance record not found', 404);
    }

    return record;
  }

  static async update(id: string, data: any, adminId: string) {
    const existing = await this.findOne(id);

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        clockInTime: data.clockInTime !== undefined ? (data.clockInTime ? new Date(data.clockInTime) : null) : undefined,
        clockOutTime: data.clockOutTime !== undefined ? (data.clockOutTime ? new Date(data.clockOutTime) : null) : undefined,
        breakDuration: data.breakDuration,
        totalWorkedHours: data.totalWorkedHours,
        overtimeHours: data.overtimeHours,
        status: data.status,
        isHoliday: data.isHoliday,
        isWeekend: data.isWeekend,
        isLeave: data.isLeave,
        leaveType: data.leaveType,
        notes: data.notes
      },
      include: { employee: true }
    });

    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'ATTENDANCE_UPDATE',
        entityType: 'ATTENDANCE',
        entityId: id,
        details: { changes: data }
      }
    });

    logger.info(`Attendance updated: ${id}`);
    return updated;
  }

  static async delete(id: string, adminId: string) {
    const record = await this.findOne(id);

    await prisma.attendance.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'ATTENDANCE_DELETE',
        entityType: 'ATTENDANCE',
        entityId: id,
        details: { employeeId: record.employeeId, date: record.date }
      }
    });

    logger.info(`Attendance deleted: ${id}`);
    return { message: 'Attendance record deleted successfully' };
  }

  static async getMonthlySummary(employeeId: string, month: number, year: number) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    const workingDaysInfo = calculateWorkingDays(year, month);
    const { startDate, endDate } = getMonthRange(month, year);

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        employeeId,
        date: { gte: startDate, lte: endDate }
      },
      orderBy: { date: 'asc' }
    });

    let presentDays = 0;
    let absentDays = 0;
    let leaveDays = 0;
    let holidayDays = 0;
    let lopDays = 0;
    let totalWorkedHours = 0;
    let totalOvertimeHours = 0;

    for (const record of attendanceRecords) {
      if (record.status === 'PRESENT') presentDays++;
      else if (record.status === 'ABSENT') absentDays++;
      else if (record.status === 'LEAVE' || record.isLeave) leaveDays++;
      else if (record.isHoliday) holidayDays++;
      else if (record.status === 'HALF_DAY') {
        presentDays += 0.5;
        absentDays += 0.5;
      }

      if (record.status === 'LOP' || (record.isLeave && record.leaveType === 'UNPAID')) {
        lopDays++;
      }

      totalWorkedHours += record.totalWorkedHours || 0;
      totalOvertimeHours += record.overtimeHours || 0;
    }

    const payableDays = workingDaysInfo.workingDays - leaveDays - lopDays;

    const summary = await prisma.attendanceSummary.upsert({
      where: {
        employeeId_month_year: { employeeId, month, year }
      },
      update: {
        totalDays: workingDaysInfo.totalDays,
        workingDays: workingDaysInfo.workingDays,
        presentDays,
        absentDays,
        leaveDays,
        holidayDays,
        weekendDays: workingDaysInfo.weekendDays,
        lopDays,
        payableDays: payableDays > 0 ? payableDays : 0,
        totalWorkedHours,
        totalOvertimeHours
      },
      create: {
        employeeId,
        month,
        year,
        totalDays: workingDaysInfo.totalDays,
        workingDays: workingDaysInfo.workingDays,
        presentDays,
        absentDays,
        leaveDays,
        holidayDays,
        weekendDays: workingDaysInfo.weekendDays,
        lopDays,
        payableDays: payableDays > 0 ? payableDays : 0,
        totalWorkedHours,
        totalOvertimeHours
      },
      include: { employee: true }
    });

    return summary;
  }

  static async getMonthlySummaryForAll(month: number, year: number) {
    const employees = await prisma.employee.findMany({
      where: { employmentStatus: 'Active' },
      select: { id: true, employeeName: true }
    });

    const summaries = [];
    for (const emp of employees) {
      const summary = await this.getMonthlySummary(emp.id, month, year);
      summaries.push(summary);
    }
    return summaries;
  }

  static async getAttendanceByDate(dateParam?: string, opts?: { useLive?: boolean }) {
    if (!dateParam) {
      throw new AppError('date query param is required. Format: YYYY-MM-DD', 400);
    }

    const targetDate = new Date(dateParam + 'T00:00:00.000Z');
    if (isNaN(targetDate.getTime())) {
      throw new AppError('Invalid date format. Use YYYY-MM-DD', 400);
    }
    targetDate.setHours(0, 0, 0, 0);

    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

    const [employees, records] = await Promise.all([
      prisma.employee.findMany({
        where: { employmentStatus: { in: ['Active', 'ACTIVE', 'active'] } },
        orderBy: { employeeName: 'asc' },
      }),
      prisma.attendance.findMany({
        where: { date: { gte: dayStart, lt: dayEnd } },
        include: { employee: true },
      }),
    ]);

    const recordMap = new Map(records.map(r => [r.employeeId, r]));
    const dayOfWeek = targetDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    let liveConnected = false;
    let liveMap = new Map<string, any>();
    if (opts?.useLive !== false) {
      try {
        const liveSummaries = await JibbleService.getLiveAttendance(dateParam, dateParam);
        liveConnected = true;
        for (const summary of liveSummaries) {
          liveMap.set(summary.personId, summary);
        }
      } catch (error: any) {
        logger.warn(`Live Jibble attendance unavailable for ${dateParam}: ${error.message}`);
      }
    }

    const rows = employees.map((emp) => {
      const rec = recordMap.get(emp.id);
      const live = emp.jibbleEmployeeId ? liveMap.get(emp.jibbleEmployeeId) : undefined;

      const clockIn = live?.clockIn || (rec?.clockInTime ? new Date(rec.clockInTime).toISOString() : null);
      const clockOut = live?.clockOut || (rec?.clockOutTime ? new Date(rec.clockOutTime).toISOString() : null);

      let status = live?.status || rec?.status || '';
      if (!status) {
        status = isWeekend ? 'WEEKEND' : 'NOT_CLOCKED_IN';
      }

      return {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.employeeName,
        email: emp.email,
        department: emp.department,
        designation: emp.designation,
        jibbleEmployeeId: emp.jibbleEmployeeId,
        attendanceId: rec?.id || null,
        attendanceDate: dateParam,
        clockIn,
        clockOut,
        breakMinutes: live?.breakMinutes ?? (rec?.breakDuration || 0),
        totalWorkedHours: live?.workedHours ?? (rec?.totalWorkedHours || 0),
        overtimeHours: live?.overtimeHours ?? (rec?.overtimeHours || 0),
        isWeekend: rec?.isWeekend ?? isWeekend,
        isHoliday: rec?.isHoliday || false,
        isLeave: rec?.isLeave || false,
        leaveType: rec?.leaveType || null,
        notes: rec?.notes || null,
        syncId: rec?.syncId || null,
        clockedIn: !!clockIn,
        status,
        source: live ? 'live' : rec ? 'synced' : 'derived'
      };
    });

    const totalEmployees = rows.length;
    const clockedIn = rows.filter(r => r.clockedIn).length;
    const present = rows.filter(r => r.status === 'PRESENT' || r.status === 'HALF_DAY').length;
    const halfDay = rows.filter(r => r.status === 'HALF_DAY').length;
    const absent = rows.filter(r => r.status === 'ABSENT').length;
    const notClockedIn = rows.filter(r => r.status === 'NOT_CLOCKED_IN').length;
    const onLeave = rows.filter(r => r.status === 'LEAVE' || r.isLeave).length;
    const holiday = rows.filter(r => r.status === 'HOLIDAY' || r.isHoliday).length;
    const weekend = rows.filter(r => r.status === 'WEEKEND').length;
    const lateArrivals = rows.filter(r => {
      if (!r.clockIn) return false;
      const d = new Date(r.clockIn);
      return d.getHours() > 9 || (d.getHours() === 9 && d.getMinutes() > 15);
    }).length;
    const overtimeEmployees = rows.filter(r => (r.overtimeHours || 0) > 0).length;
    const totalHours = rows.reduce((s, r) => s + (r.totalWorkedHours || 0), 0);
    const totalOvertime = rows.reduce((s, r) => s + (r.overtimeHours || 0), 0);
    const totalBreak = rows.reduce((s, r) => s + (r.breakMinutes || 0), 0);
    const avgHours = present > 0 ? totalHours / present : 0;

    return {
      date: dateParam,
      totalEmployees,
      live: liveConnected,
      rows,
      stats: {
        totalEmployees,
        clockedIn,
        present,
        halfDay,
        absent,
        notClockedIn,
        onLeave,
        holiday,
        weekend,
        lateArrivals,
        overtimeEmployees,
        totalHours,
        totalOvertime,
        totalBreak,
        avgHours,
        avgHoursPerClockedIn: clockedIn > 0 ? totalHours / clockedIn : 0
      }
    };
  }

  static async getDashboardAttendance(dateParam?: string) {
    const targetDate = dateParam ? new Date(dateParam + 'T00:00:00.000Z') : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

    const todayRecords = await prisma.attendance.findMany({
      where: {
        date: { gte: dayStart, lt: dayEnd }
      },
      include: { employee: true }
    });

    const totalEmployees = await prisma.employee.count({
      where: { employmentStatus: 'Active' }
    });

    const clockedIn = todayRecords.filter(r => r.clockInTime !== null).length;
    const notClockedIn = totalEmployees - clockedIn;
    const onLeave = todayRecords.filter(r => r.isLeave || r.status === 'LEAVE').length;
    const lateArrivals = todayRecords.filter(r => {
      if (!r.clockInTime) return false;
      const clockIn = new Date(r.clockInTime);
      return clockIn.getHours() > 9 || (clockIn.getHours() === 9 && clockIn.getMinutes() > 15);
    }).length;
    const overtime = todayRecords.filter(r => (r.overtimeHours || 0) > 0).length;

    return {
      date: dayStart,
      totalEmployees,
      todayPresent: clockedIn,
      currentWorking: clockedIn,
      clockedIn,
      notClockedIn,
      onLeave,
      lateArrivals,
      overtimeEmployees: overtime
    };
  }

  static async syncFromJibble(data: any[], adminId: string) {
    const results = { created: 0, updated: 0, failed: 0, errors: [] as any[] };

    for (const record of data) {
      try {
        const employee = await prisma.employee.findFirst({
          where: {
            OR: [
              { jibbleEmployeeId: record.jibbleEmployeeId },
              { employeeCode: record.employeeCode },
              { email: record.email }
            ]
          }
        });

        if (!employee) {
          results.failed++;
          results.errors.push({ record, error: 'Employee not found' });
          continue;
        }

        const attendanceDate = new Date(record.date);
        attendanceDate.setHours(0, 0, 0, 0);

        const existing = await prisma.attendance.findFirst({
          where: {
            employeeId: employee.id,
            date: {
              gte: new Date(attendanceDate.getFullYear(), attendanceDate.getMonth(), attendanceDate.getDate()),
              lt: new Date(attendanceDate.getFullYear(), attendanceDate.getMonth(), attendanceDate.getDate() + 1)
            }
          }
        });

        const attendanceData = {
          employeeId: employee.id,
          date: attendanceDate,
          clockInTime: record.clockIn ? new Date(record.clockIn) : null,
          clockOutTime: record.clockOut ? new Date(record.clockOut) : null,
          totalWorkedHours: record.totalHours || 0,
          overtimeHours: record.overtime || 0,
          status: record.status || 'PRESENT',
          isHoliday: record.isHoliday || false,
          isWeekend: record.isWeekend || false,
          isLeave: record.isLeave || false,
          leaveType: record.leaveType || null,
          notes: record.notes || null,
          syncId: record.syncId || null
        };

        if (existing) {
          await prisma.attendance.update({
            where: { id: existing.id },
            data: attendanceData
          });
          results.updated++;
        } else {
          await prisma.attendance.create({ data: attendanceData });
          results.created++;
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push({ record, error: error.message });
      }
    }

    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'JIBBLE_SYNC',
        entityType: 'ATTENDANCE',
        entityId: null,
        details: { results }
      }
    });

    logger.info(`Jibble sync completed: ${results.created} created, ${results.updated} updated, ${results.failed} failed`);
    return results;
  }
}
