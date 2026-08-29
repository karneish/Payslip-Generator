export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface Employee {
  id: string;
  employeeCode: string;
  employeeName: string;
  email: string;
  phoneNumber: string;
  department: string;
  designation: string;
  panNumber: string;
  aadharNumber: string;
  uanNumber: string;
  pfNumber: string;
  esiNumber: string;
  bankName: string;
  bankAccountNumber: string;
  ifscCode: string;
  joiningDate: string;
  employmentStatus: string;
  category?: string;
  basicSalary: number;
  hra: number;
  da: number;
  medicalAllowance: number;
  travelAllowance: number;
  specialAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  netSalary: number;
  jibbleEmployeeId?: string;
  syncStatus?: string;
  lastSyncTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payslip {
  id: string;
  employeeId: string;
  employee?: Employee;
  month: number;
  year: number;
  basicSalary: number;
  hra: number;
  da: number;
  medicalAllowance: number;
  travelAllowance: number;
  specialAllowance: number;
  otherAllowances: number;
  bonus: number;
  incentive: number;
  overtimePay: number;
  grossSalary: number;
  totalEarnings: number;
  pfDeduction: number;
  esiDeduction: number;
  professionalTax: number;
  incomeTax: number;
  lateDeduction: number;
  leaveDeduction: number;
  otherDeductions: number;
  advanceDeduction: number;
  totalDeductions: number;
  netSalary: number;
  amountInWords?: string;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  lopDays: number;
  payableDays: number;
  weekendDays: number;
  holidayDays: number;
  status: string;
  pdfPath?: string;
  pdfSize?: number;
  generatedAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  employee?: Employee;
  date: string;
  clockInTime?: string;
  clockOutTime?: string;
  totalWorkedHours: number;
  overtimeHours: number;
  breakDuration: number;
  status: string;
  isHoliday: boolean;
  isWeekend: boolean;
  isLeave: boolean;
  notes?: string;
  createdAt: string;
}

export interface AttendanceSummary {
  id: string;
  employeeId: string;
  employee?: Employee;
  month: number;
  year: number;
  totalDays: number;
  workingDays: number;
  totalWorkedHours: number;
  totalOvertimeHours: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  lopDays: number;
  payableDays: number;
  weekendDays: number;
  holidayDays: number;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  head?: string;
}

export interface Designation {
  id: string;
  name: string;
  code: string;
  departmentId: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface EmailLog {
  id: string;
  employeeId: string;
  payslipId: string;
  recipientEmail: string;
  subject: string;
  body?: string;
  status: string;
  sentAt: string;
}

export interface UploadedFile {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  recordCount: number;
  status: string;
  month?: number;
  year?: number;
  createdAt: string;
}

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  currentMonthPayslips: number;
  generatedPayslips: number;
  uploadedSalaryFiles: number;
  pendingPayslips: number;
  monthlyPayslipCount: { month: string; count: number }[];
  departmentDistribution: { department: string; count: number }[];
  salaryDistribution: { range: string; count: number }[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  total?: number;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  employees?: T[];
  payslips?: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EmployeeDependencies {
  payslips: number;
  attendance: number;
  attendanceSummaries: number;
  emailLogs: number;
  generatedPayslips: number;
  salaryHistory: number;
  parsedSalaryData: number;
  total: number;
}
