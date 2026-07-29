import { z } from 'zod';

export const companyProfileSchema = z.object({
  body: z.object({
    companyName: z.string().min(1, 'Company name is required'),
    address: z.string().optional(),
    logo: z.string().optional(),
    gstNumber: z.string().optional(),
    panNumber: z.string().optional(),
    phoneNumber: z.string().optional(),
    email: z.string().email('Invalid email format').optional().or(z.literal('')),
    website: z.string().url('Invalid URL format').optional().or(z.literal('')),
    authorizedSignatory: z.string().optional(),
    footerText: z.string().optional()
  })
});

export const smtpConfigSchema = z.object({
  body: z.object({
    host: z.string().min(1, 'SMTP host is required'),
    port: z.number().int().positive('Port must be a positive number'),
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
    senderName: z.string().min(1, 'Sender name is required'),
    senderEmail: z.string().email('Invalid sender email format'),
    encryption: z.enum(['NONE', 'SSL', 'TLS']).default('TLS')
  })
});

export const appSettingSchema = z.object({
  body: z.object({
    key: z.string().min(1, 'Key is required'),
    value: z.string().min(1, 'Value is required'),
    category: z.string().min(1, 'Category is required')
  })
});

export const updateAppSettingSchema = z.object({
  body: z.object({
    value: z.string().min(1, 'Value is required')
  })
});

export const settingKeyParamSchema = z.object({
  params: z.object({
    key: z.string().min(1, 'Setting key is required')
  })
});

export const createDepartmentSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Department name is required'),
    code: z.string().min(1, 'Department code is required'),
    description: z.string().optional(),
    head: z.string().optional()
  })
});

export const createDesignationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Designation name is required'),
    code: z.string().min(1, 'Designation code is required'),
    departmentId: z.string().min(1, 'Department ID is required'),
    description: z.string().optional()
  })
});

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'ID is required')
  })
});

export type CompanyProfileBody = z.infer<typeof companyProfileSchema>['body'];
export type SmtpConfigBody = z.infer<typeof smtpConfigSchema>['body'];
export type AppSettingBody = z.infer<typeof appSettingSchema>['body'];
