export interface CreatePayslipInput {
  employeeId: string;
  month: number;
  year: number;
  basicSalary: number;
  hra: number;
  da: number;
  medicalAllowance: number;
  travelAllowance: number;
  specialAllowance: number;
  otherAllowances: number;
  bonus?: number;
  incentive?: number;
  overtimePay?: number;
  pfDeduction: number;
  esiDeduction: number;
  professionalTax: number;
  incomeTax?: number;
  leaveDeduction?: number;
  lateDeduction?: number;
  otherDeductions?: number;
  advanceDeduction?: number;
  leaveDays?: number;
  lopDays?: number;
  status?: string;
}

export interface PayslipData {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  designation: string;
  month: number;
  year: number;
  monthName: string;
  totalDays: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  holidayDays: number;
  weekendDays: number;
  lopDays: number;
  payableDays: number;
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
  totalEarnings: number;
  pfDeduction: number;
  esiDeduction: number;
  professionalTax: number;
  incomeTax: number;
  leaveDeduction: number;
  lateDeduction: number;
  otherDeductions: number;
  advanceDeduction: number;
  totalDeductions: number;
  grossSalary: number;
  netSalary: number;
  amountInWords: string | null;
  status: string;
  pdfPath: string | null;
  pdfSize: number | null;
  generatedAt: Date | null;
  generatedBy: string | null;
  sentAt: Date | null;
  sentBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SalaryBreakdown {
  basic: number;
  hra: number;
  da: number;
  medicalAllowance: number;
  travelAllowance: number;
  specialAllowance: number;
  otherAllowances: number;
  bonus: number;
  incentive: number;
  overtimePay: number;
  pf: number;
  esi: number;
  professionalTax: number;
  incomeTax: number;
  leaveDeduction: number;
  lateDeduction: number;
  otherDeductions: number;
  advanceDeduction: number;
}

export interface WorkingDaysInfo {
  year: number;
  month: number;
  totalDays: number;
  workingDays: number;
  weekendDays: number;
  saturdays: number;
  sundays: number;
  isLeapYear: boolean;
}

export interface PayslipFilters {
  employeeId?: string;
  department?: string;
  month?: number;
  year?: number;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
}
