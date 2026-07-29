import { z } from 'zod';

const payslipSalaryFields = {
  totalDays: z.number().int().nonnegative().default(0),
  workingDays: z.number().int().nonnegative().default(0),
  presentDays: z.number().int().nonnegative().default(0),
  absentDays: z.number().int().nonnegative().default(0),
  leaveDays: z.number().int().nonnegative().default(0),
  holidayDays: z.number().int().nonnegative().default(0),
  weekendDays: z.number().int().nonnegative().default(0),
  lopDays: z.number().int().nonnegative().default(0),
  payableDays: z.number().int().nonnegative().default(0),
  basicSalary: z.number().nonnegative().default(0),
  hra: z.number().nonnegative().default(0),
  da: z.number().nonnegative().default(0),
  medicalAllowance: z.number().nonnegative().default(0),
  travelAllowance: z.number().nonnegative().default(0),
  specialAllowance: z.number().nonnegative().default(0),
  otherAllowances: z.number().nonnegative().default(0),
  bonus: z.number().nonnegative().default(0),
  incentive: z.number().nonnegative().default(0),
  overtimePay: z.number().nonnegative().default(0),
  totalEarnings: z.number().nonnegative().default(0),
  pfDeduction: z.number().nonnegative().default(0),
  esiDeduction: z.number().nonnegative().default(0),
  professionalTax: z.number().nonnegative().default(0),
  incomeTax: z.number().nonnegative().default(0),
  leaveDeduction: z.number().nonnegative().default(0),
  lateDeduction: z.number().nonnegative().default(0),
  otherDeductions: z.number().nonnegative().default(0),
  advanceDeduction: z.number().nonnegative().default(0),
  totalDeductions: z.number().nonnegative().default(0),
  grossSalary: z.number().nonnegative().default(0),
  netSalary: z.number().nonnegative().default(0),
  amountInWords: z.string().optional(),
  status: z.enum(['DRAFT', 'GENERATED', 'APPROVED', 'PAID', 'CANCELLED']).default('DRAFT')
};

export const createPayslipSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
    month: z.number().int().min(1, 'Month must be between 1 and 12').max(12),
    year: z.number().int().min(2020, 'Year must be 2020 or later').max(2100),
    ...payslipSalaryFields
  })
});

export const updatePayslipSchema = z.object({
  body: z.object({
    totalDays: z.number().int().nonnegative().optional(),
    workingDays: z.number().int().nonnegative().optional(),
    presentDays: z.number().int().nonnegative().optional(),
    absentDays: z.number().int().nonnegative().optional(),
    leaveDays: z.number().int().nonnegative().optional(),
    holidayDays: z.number().int().nonnegative().optional(),
    weekendDays: z.number().int().nonnegative().optional(),
    lopDays: z.number().int().nonnegative().optional(),
    payableDays: z.number().int().nonnegative().optional(),
    basicSalary: z.number().nonnegative().optional(),
    hra: z.number().nonnegative().optional(),
    da: z.number().nonnegative().optional(),
    medicalAllowance: z.number().nonnegative().optional(),
    travelAllowance: z.number().nonnegative().optional(),
    specialAllowance: z.number().nonnegative().optional(),
    otherAllowances: z.number().nonnegative().optional(),
    bonus: z.number().nonnegative().optional(),
    incentive: z.number().nonnegative().optional(),
    overtimePay: z.number().nonnegative().optional(),
    totalEarnings: z.number().nonnegative().optional(),
    pfDeduction: z.number().nonnegative().optional(),
    esiDeduction: z.number().nonnegative().optional(),
    professionalTax: z.number().nonnegative().optional(),
    incomeTax: z.number().nonnegative().optional(),
    leaveDeduction: z.number().nonnegative().optional(),
    lateDeduction: z.number().nonnegative().optional(),
    otherDeductions: z.number().nonnegative().optional(),
    advanceDeduction: z.number().nonnegative().optional(),
    totalDeductions: z.number().nonnegative().optional(),
    grossSalary: z.number().nonnegative().optional(),
    netSalary: z.number().nonnegative().optional(),
    amountInWords: z.string().optional(),
    status: z.enum(['DRAFT', 'GENERATED', 'APPROVED', 'PAID', 'CANCELLED']).optional()
  })
});

export const payslipQuerySchema = z.object({
  query: z.object({
    month: z.preprocess(
      (val) => (val === undefined || val === null || val === '' ? undefined : Number(val)),
      z.number().int().min(1).max(12).optional()
    ),
    year: z.preprocess(
      (val) => (val === undefined || val === null || val === '' ? undefined : Number(val)),
      z.number().int().min(2020).max(2100).optional()
    ),
    employeeId: z.string().uuid().optional(),
    department: z.string().optional(),
    status: z.enum(['DRAFT', 'GENERATED', 'APPROVED', 'PAID', 'CANCELLED']).optional(),
    page: z.preprocess(
      (val) => (val === undefined || val === null || val === '' ? 1 : Number(val)),
      z.number().int().positive()
    ),
    limit: z.preprocess(
      (val) => (val === undefined || val === null || val === '' ? 10 : Number(val)),
      z.number().int().positive().max(1000)
    )
  })
});

export const generatePayslipSchema = z.object({
  params: z.object({
    payslipId: z.string().uuid('Invalid payslip ID format')
  })
});

export const payslipIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid payslip ID format')
  })
});

export type CreatePayslipBody = z.infer<typeof createPayslipSchema>['body'];
export type UpdatePayslipBody = z.infer<typeof updatePayslipSchema>['body'];
export type PayslipQuery = z.infer<typeof payslipQuerySchema>['query'];
