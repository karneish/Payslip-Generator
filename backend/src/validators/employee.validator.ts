import { z } from 'zod';

const employeeFields = {
  employeeCode: z.string().min(1, 'Employee code is required'),
  employeeName: z.string().min(1, 'Employee name is required'),
  email: z.string().email('Invalid email format'),
  phoneNumber: z.string().optional().default(''),
  department: z.string().optional().default('General'),
  designation: z.string().optional().default('Employee'),
  panNumber: z.string().optional().default(''),
  aadharNumber: z.string().optional(),
  uanNumber: z.string().optional().default(''),
  pfNumber: z.string().optional().default(''),
  esiNumber: z.string().optional().default(''),
  bankName: z.string().optional().default(''),
  bankAccountNumber: z.string().optional().default(''),
  ifscCode: z.string().optional().default(''),
  joiningDate: z.string().optional().default(new Date().toISOString().split('T')[0]),
  employmentStatus: z.string().default('Active'),
  category: z.string().optional().default('Developer'),
  basicSalary: z.number().nonnegative().default(0),
  hra: z.number().nonnegative().default(0),
  da: z.number().nonnegative().default(0),
  medicalAllowance: z.number().nonnegative().default(0),
  travelAllowance: z.number().nonnegative().default(0),
  specialAllowance: z.number().nonnegative().default(0),
  otherAllowances: z.number().nonnegative().default(0)
};

export const createEmployeeSchema = z.object({
  body: z.object(employeeFields)
});

export const updateEmployeeSchema = z.object({
  body: z.object({
    employeeCode: z.string().min(1).optional(),
    employeeName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phoneNumber: z.string().optional(),
    department: z.string().optional(),
    designation: z.string().optional(),
    panNumber: z.string().optional(),
    aadharNumber: z.string().optional(),
    uanNumber: z.string().optional(),
    pfNumber: z.string().optional(),
    esiNumber: z.string().optional(),
    bankName: z.string().optional(),
    bankAccountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
    joiningDate: z.string().optional(),
    employmentStatus: z.string().optional(),
    category: z.string().optional(),
    basicSalary: z.number().nonnegative().optional(),
    hra: z.number().nonnegative().optional(),
    da: z.number().nonnegative().optional(),
    medicalAllowance: z.number().nonnegative().optional(),
    travelAllowance: z.number().nonnegative().optional(),
    specialAllowance: z.number().nonnegative().optional(),
    otherAllowances: z.number().nonnegative().optional()
  })
});

export const employeeQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    department: z.string().optional(),
    status: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(1000).default(10)
  })
});

export const employeeIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid employee ID format')
  })
});

export const importEmployeeSchema = z.object({
  body: z.object({
    employees: z.array(z.object(employeeFields)).min(1, 'At least one employee is required')
  })
});

export type CreateEmployeeBody = z.infer<typeof createEmployeeSchema>['body'];
export type UpdateEmployeeBody = z.infer<typeof updateEmployeeSchema>['body'];
export type EmployeeQuery = z.infer<typeof employeeQuerySchema>['query'];
