import { prisma } from '../../config/database';
import { AppError } from '../../utils/error-handler';
import { logger } from '../../utils/logger';
import {
  JibbleAccessToken,
  JibblePerson,
  JibbleTimeEntry,
  JibbleDailyAttendance,
  JibbleSyncResult,
  JibbleApiResponse,
} from './jibble.types';

let tokenCache: { token: string; expiresAt: number } = { token: '', expiresAt: 0 };

export class JibbleService {
  private static readonly identityUrl = process.env.JIBBLE_IDENTITY_URL || 'https://identity.prod.jibble.io/connect/token';
  private static readonly timeTrackingUrl = process.env.JIBBLE_TIME_TRACKING_URL || 'https://time-tracking.prod.jibble.io/v1';
  private static readonly workspaceUrl = process.env.JIBBLE_WORKSPACE_URL || 'https://workspace.prod.jibble.io/v1';
  private static readonly clientId = process.env.JIBBLE_CLIENT_ID || '';
  private static readonly clientSecret = process.env.JIBBLE_CLIENT_SECRET || '';

  static async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (tokenCache.token && tokenCache.expiresAt - 60000 > now) {
      return tokenCache.token;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new AppError('JIBBLE_CLIENT_ID and JIBBLE_CLIENT_SECRET must be configured', 500);
    }

    logger.info('Requesting new Jibble OAuth2 access token');

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await fetch(this.identityUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error(`Jibble OAuth2 token error: ${response.status} - ${text}`);
      throw new AppError(`Jibble authentication failed: ${response.statusText}`, response.status);
    }

    const data = await response.json() as JibbleAccessToken;
    const expiresInMs = (data.expires_in || 3600) * 1000;
    tokenCache = {
      token: data.access_token,
      expiresAt: now + expiresInMs,
    };

    logger.info(`Jibble access token obtained, expires in ${data.expires_in}s`);
    return data.access_token;
  }

  private static async apiGet<T>(baseUrl: string, path: string, params?: Record<string, string>): Promise<T> {
    const token = await this.getAccessToken();
    const url = new URL(`${baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    }

    logger.info(`Jibble API GET: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error(`Jibble API error (${path}): ${response.status} - ${text}`);
      throw new AppError(`Jibble API error: ${response.statusText}`, response.status);
    }

    return response.json() as Promise<T>;
  }

  private static extractResponseArray<T>(data: JibbleApiResponse<T[]> | T[]): T[] {
    if (Array.isArray(data)) return data;
    const obj = data as JibbleApiResponse<T[]>;
    return obj?.value || obj?.data || obj?.records || [];
  }

  static async fetchPeople(): Promise<JibblePerson[]> {
    const data = await this.apiGet<JibbleApiResponse<JibblePerson[]>>(this.timeTrackingUrl, '/People');
    return this.extractResponseArray(data);
  }

  static async fetchTimeEntries(startDate: string, endDate: string): Promise<JibbleTimeEntry[]> {
    const filter = `belongsToDate ge ${startDate} and belongsToDate le ${endDate}`;
    const data = await this.apiGet<JibbleApiResponse<JibbleTimeEntry[]>>(this.timeTrackingUrl, '/TimeEntries', {
      $filter: filter,
      $orderby: 'time asc',
    });
    return this.extractResponseArray(data);
  }

  static async fetchTimeEntriesForPerson(personId: string, startDate: string, endDate: string): Promise<JibbleTimeEntry[]> {
    const filter = `personId eq '${personId}' and belongsToDate ge ${startDate} and belongsToDate le ${endDate}`;
    const data = await this.apiGet<JibbleApiResponse<JibbleTimeEntry[]>>(this.timeTrackingUrl, '/TimeEntries', {
      $filter: filter,
      $orderby: 'time asc',
    });
    return this.extractResponseArray(data);
  }

  private static processTimeEntries(dayEntries: JibbleTimeEntry[]): { clockIn: string | null; clockOut: string | null; breakMinutes: number; workedMinutes: number; workedHours: number; overtimeHours: number; firstIn: string | null; lastOut: string | null; status: string } {
    const sorted = [...dayEntries].sort((a: JibbleTimeEntry, b: JibbleTimeEntry) => new Date(a.time).getTime() - new Date(b.time).getTime());

    let clockIn: string | null = null;
    let clockOut: string | null = null;
    let pendingBreakStart: string | null = null;
    let breakMinutes = 0;

    let lastInTime: string | null = null;

    for (const entry of sorted) {
      switch (entry.type) {
        case 'In':
          if (!clockIn) clockIn = entry.time;
          lastInTime = entry.time;
          break;
        case 'Out':
          clockOut = entry.time;
          lastInTime = null;
          break;
        case 'StartBreak':
          pendingBreakStart = entry.time;
          break;
        case 'EndBreak':
          if (pendingBreakStart) {
            const breakMs = new Date(entry.time).getTime() - new Date(pendingBreakStart).getTime();
            breakMinutes += breakMs / (1000 * 60);
          }
          pendingBreakStart = null;
          break;
      }
    }

    if (!clockOut && lastInTime) {
      clockOut = lastInTime;
    }

    const workedMinutes = clockIn && clockOut
      ? Math.max(0, (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / (1000 * 60) - breakMinutes)
      : 0;
    const workedHours = workedMinutes / 60;

    return {
      clockIn,
      clockOut,
      breakMinutes: Math.round(breakMinutes),
      workedMinutes: Math.round(workedMinutes),
      workedHours: Math.round(workedHours * 100) / 100,
      overtimeHours: Math.round(Math.max(0, workedHours - 8) * 100) / 100,
      firstIn: clockIn,
      lastOut: clockOut,
      status: JibbleService.computeStatus(clockIn, workedHours, new Date(dayEntries[0].belongsToDate).getDay()),
    };
  }

  private static computeStatus(clockIn: string | null, workedHours: number, dayOfWeek: number): string {
    if (!clockIn) {
      return (dayOfWeek === 0 || dayOfWeek === 6) ? 'WEEKEND' : 'ABSENT';
    }
    if (workedHours > 0 && workedHours < 4) return 'HALF_DAY';
    return 'PRESENT';
  }

  static groupTimeEntriesByPersonAndDate(entries: JibbleTimeEntry[]): JibbleDailyAttendance[] {
    const grouped = new Map<string, Map<string, JibbleTimeEntry[]>>();

    for (const entry of entries) {
      const { personId, belongsToDate: date } = entry;
      if (!grouped.has(personId)) {
        grouped.set(personId, new Map());
      }
      const dateMap = grouped.get(personId)!;
      if (!dateMap.has(date)) {
        dateMap.set(date, []);
      }
      dateMap.get(date)!.push(entry);
    }

    const dailySummaries: JibbleDailyAttendance[] = [];

    for (const [personId, dateMap] of grouped) {
      for (const [date, dayEntries] of dateMap) {
        const processed = this.processTimeEntries(dayEntries);
        dailySummaries.push({ personId, personName: '', date, ...processed });
      }
    }

    return [...dailySummaries].sort((a: JibbleDailyAttendance, b: JibbleDailyAttendance) => a.date.localeCompare(b.date) || a.personId.localeCompare(b.personId));
  }

  private static buildPersonMap(people: JibblePerson[]): Map<string, JibblePerson> {
    const personMap = new Map<string, JibblePerson>();
    for (const person of people) {
      personMap.set(person.id, person);
    }
    return personMap;
  }

  private static resolvePersonName(personMap: Map<string, JibblePerson>, personId: string): string {
    const person = personMap.get(personId);
    return person?.fullName || 'Unknown';
  }

  static async getLiveAttendance(startDate: string, endDate: string): Promise<JibbleDailyAttendance[]> {
    logger.info(`Fetching live attendance from Jibble: ${startDate} to ${endDate}`);

    const [people, timeEntries] = await Promise.all([
      this.fetchPeople(),
      this.fetchTimeEntries(startDate, endDate),
    ]);

    const personMap = this.buildPersonMap(people);
    const dailySummaries = this.groupTimeEntriesByPersonAndDate(timeEntries);

    for (const summary of dailySummaries) {
      summary.personName = this.resolvePersonName(personMap, summary.personId);
    }

    return dailySummaries;
  }

  private static async findMatchingEmployee(personId: string, person?: JibblePerson) {
    const byJibbleId = await prisma.employee.findFirst({
      where: { jibbleEmployeeId: personId },
    });
    if (byJibbleId) return byJibbleId;

    if (person?.fullName) {
      const nameParts = person.fullName.trim().split(/\s+/);
      for (const part of nameParts) {
        if (part.length < 3) continue;
        const match = await prisma.employee.findFirst({
          where: { employeeName: { contains: part, mode: 'insensitive' as any } },
        });
        if (match) return match;
      }
    }

    return null;
  }

  private static async upsertAttendance(employeeId: string, attendanceDate: Date, attendanceData: any): Promise<boolean> {
    const dayStart = new Date(attendanceDate.getFullYear(), attendanceDate.getMonth(), attendanceDate.getDate());
    const dayEnd = new Date(attendanceDate.getFullYear(), attendanceDate.getMonth(), attendanceDate.getDate() + 1);

    const existing = await prisma.attendance.findFirst({
      where: { employeeId, date: { gte: dayStart, lt: dayEnd } },
    });

    if (existing) {
      await prisma.attendance.update({ where: { id: existing.id }, data: attendanceData });
      return false;
    }

    await prisma.attendance.create({
      data: { employeeId, date: attendanceDate, ...attendanceData },
    });
    return true;
  }

  private static buildAttendanceData(summary: JibbleDailyAttendance) {
    return {
      clockInTime: summary.clockIn ? new Date(summary.clockIn) : null,
      clockOutTime: summary.clockOut ? new Date(summary.clockOut) : null,
      breakDuration: summary.breakMinutes,
      totalWorkedHours: summary.workedHours,
      overtimeHours: summary.overtimeHours,
      status: summary.status,
      isWeekend: summary.status === 'WEEKEND',
    };
  }

  private static async autoProvisionEmployee(person: JibblePerson): Promise<any | null> {
    try {
      const name = person.fullName || 'Unknown';
      const email = `${name.toLowerCase().replace(/\s+/g, '.')}@placeholder.com`;
      const codePrefix = name.substring(0, 2).toUpperCase();
      const count = await prisma.employee.count();
      const employeeCode = `${codePrefix}${String(count + 1).padStart(3, '0')}`;

      const newEmployee = await prisma.employee.create({
        data: {
          employeeCode,
          employeeName: name,
          email,
          phoneNumber: '',
          department: 'Operations',
          designation: 'Employee',
          panNumber: '',
          aadharNumber: `AUTO${Date.now()}${Math.random().toString(36).substring(2, 6)}`,
          bankName: '',
          bankAccountNumber: '',
          ifscCode: '',
          joiningDate: new Date(),
          employmentStatus: 'Active',
          jibbleEmployeeId: person.id,
          syncStatus: 'SYNCED',
          lastSyncTime: new Date(),
        },
      });

      logger.info(`Auto-provisioned employee during sync: ${name} (${employeeCode})`);
      return newEmployee;
    } catch (err: any) {
      logger.error(`Failed to auto-provision employee ${person.fullName}: ${err.message}`);
      return null;
    }
  }

  private static async processSyncRecord(
    summary: JibbleDailyAttendance,
    personMap: Map<string, JibblePerson>,
    result: JibbleSyncResult
  ): Promise<void> {
    const personName = this.resolvePersonName(personMap, summary.personId);
    summary.personName = personName;

    let employee = await this.findMatchingEmployee(summary.personId, personMap.get(summary.personId));

    if (!employee) {
      const person = personMap.get(summary.personId);
      if (person && person.status === 'Joined') {
        employee = await this.autoProvisionEmployee(person);
        if (employee) {
          result.employeesProvisioned++;
        }
      }
    }

    if (!employee) {
      result.failed++;
      result.errors.push({
        employeeId: summary.personId,
        employeeName: personName,
        error: `No matching employee found for Jibble person: ${personName} (${summary.personId})`,
      });
      return;
    }

    const attendanceDate = new Date(summary.date + 'T00:00:00.000Z');
    const attendanceData = this.buildAttendanceData(summary);
    const created = await this.upsertAttendance(employee.id, attendanceDate, attendanceData);

    result.synced++;
    if (created) {
      result.created++;
    } else {
      result.updated++;
    }
    result.dailySummaries.push(summary);
  }

  static async syncAttendance(
    startDate: string,
    endDate: string,
    adminId: string
  ): Promise<JibbleSyncResult> {
    logger.info(`Starting Jibble sync: ${startDate} to ${endDate}`);

    const [people, timeEntries] = await Promise.all([
      this.fetchPeople(),
      this.fetchTimeEntries(startDate, endDate),
    ]);

    const personMap = this.buildPersonMap(people);
    const dailySummaries = this.groupTimeEntriesByPersonAndDate(timeEntries);
    const result: JibbleSyncResult = {
      synced: 0, created: 0, updated: 0, failed: 0, employeesProvisioned: 0, errors: [], dailySummaries: [],
    };

    for (const summary of dailySummaries) {
      try {
        await this.processSyncRecord(summary, personMap, result);
      } catch (err: any) {
        result.failed++;
        result.errors.push({
          employeeId: summary.personId,
          employeeName: summary.personName || 'Unknown',
          error: err.message || 'Unknown error',
        });
        logger.error(`Failed to sync attendance for ${summary.personId}`, err);
      }
    }

    await this.createSyncHistory(startDate, endDate, adminId, result);
    logger.info(`Jibble sync complete: ${result.synced} synced (${result.created} created, ${result.updated} updated), ${result.employeesProvisioned} employees provisioned, ${result.failed} failed`);
    return result;
  }

  private static async createSyncHistory(startDate: string, endDate: string, adminId: string, result: JibbleSyncResult) {
    await prisma.jibbleSyncHistory.create({
      data: {
        syncType: 'ATTENDANCE',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        recordsSynced: result.synced,
        recordsFailed: result.failed,
        status: result.failed > 0 ? 'PARTIAL' : 'COMPLETED',
        initiatedBy: adminId,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'JIBBLE_SYNC',
        entityType: 'ATTENDANCE',
        entityId: null,
        details: {
          startDate,
          endDate,
          synced: result.synced,
          created: result.created,
          updated: result.updated,
          failed: result.failed,
        },
      },
    });
  }

  static async getSyncHistory(filters: { page: number; limit: number }) {
    const { page, limit } = filters;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      prisma.jibbleSyncHistory.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.jibbleSyncHistory.count(),
    ]);

    return {
      records,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  static async mapJibbleEmployee(employeeId: string, jibbleEmployeeId: string, jibbleUserId: string) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    const updateData: any = { jibbleEmployeeId, syncStatus: 'SYNCED', lastSyncTime: new Date() };
    if (jibbleUserId) updateData.jibbleUserId = jibbleUserId;

    const updated = await prisma.employee.update({
      where: { id: employeeId },
      data: updateData,
    });

    logger.info(`Mapped employee ${employeeId} to Jibble IDs: employeeId=${jibbleEmployeeId}, userId=${jibbleUserId}`);
    return updated;
  }

  static async provisionEmployeesFromJibble() {
    const people = await this.fetchPeople();
    const activePeople = people.filter(p => p.status === 'Joined');

    const created: any[] = [];
    const skipped: any[] = [];
    const mapped: any[] = [];

    for (const person of activePeople) {
      const name = person.fullName || 'Unknown';
      const email = `${name.toLowerCase().replace(/\s+/g, '.')}@placeholder.com`;

      const existingByJibble = await this.findMatchingEmployee(person.id, person);

      if (existingByJibble) {
        if (!existingByJibble.jibbleEmployeeId) {
          const updated = await prisma.employee.update({
            where: { id: existingByJibble.id },
            data: { jibbleEmployeeId: person.id, syncStatus: 'SYNCED', lastSyncTime: new Date() },
          });
          mapped.push(updated);
        } else {
          skipped.push({ name, email, reason: 'Already mapped' });
        }
        continue;
      }

      const codePrefix = name.substring(0, 2).toUpperCase();
      const count = await prisma.employee.count();
      const employeeCode = `${codePrefix}${String(count + 1).padStart(3, '0')}`;

      const createData: any = {
        employeeCode,
        employeeName: name,
        email,
        phoneNumber: '',
        department: 'Operations',
        designation: 'Employee',
        panNumber: '',
        aadharNumber: `AUTO${Date.now()}${Math.random().toString(36).substring(2, 6)}`,
        bankName: '',
        bankAccountNumber: '',
        ifscCode: '',
        joiningDate: new Date(),
        employmentStatus: 'Active',
        jibbleEmployeeId: person.id,
        syncStatus: 'SYNCED',
        lastSyncTime: new Date(),
      };

      const newEmployee = await prisma.employee.create({ data: createData });

      created.push(newEmployee);
      logger.info(`Auto-created employee: ${name} (${employeeCode}) mapped to Jibble ID: ${person.id}`);
    }

    return {
      total: activePeople.length,
      created: created.length,
      mapped: mapped.length,
      skipped: skipped.length,
      employees: [...created, ...mapped],
      details: { created, mapped, skipped },
    };
  }
}
