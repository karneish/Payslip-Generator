export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: Date;
  clockInTime: Date | null;
  clockOutTime: Date | null;
  breakDuration: number | null;
  totalWorkedHours: number | null;
  overtimeHours: number | null;
  status: string;
  isHoliday: boolean;
  isWeekend: boolean;
  isLeave: boolean;
  leaveType: string | null;
  notes: string | null;
  syncId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceSummaryData {
  employeeId: string;
  month: number;
  year: number;
  totalDays: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  holidayDays: number;
  weekendDays: number;
  lopDays: number;
  payableDays: number;
  totalWorkedHours: number;
  totalOvertimeHours: number;
  lateDeductions: number;
  attendanceDeductions: number;
}

export interface SyncAttendanceInput {
  employeeId: string;
  records: {
    date: string;
    clockInTime?: string;
    clockOutTime?: string;
    totalWorkedHours?: number;
    overtimeHours?: number;
    status?: string;
    isHoliday?: boolean;
    isWeekend?: boolean;
    isLeave?: boolean;
    leaveType?: string;
    notes?: string;
  }[];
}

export interface AttendanceFilters {
  employeeId?: string;
  department?: string;
  month?: number;
  year?: number;
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  leaveType?: string;
}

export interface DailyAttendance {
  date: Date;
  dayName: string;
  clockInTime?: Date | null;
  clockOutTime?: Date | null;
  totalWorkedHours?: number | null;
  overtimeHours?: number | null;
  status: string;
  leaveType?: string | null;
  notes?: string | null;
}

export interface MonthlyAttendanceSummary {
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  monthName: string;
  totalDays: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  holidays: number;
  weekOffs: number;
  totalWorkedHours: number;
  overtimeHours: number;
  attendancePercentage: number;
  dailyAttendance: DailyAttendance[];
}
