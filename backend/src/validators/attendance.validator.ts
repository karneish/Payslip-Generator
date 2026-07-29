import { z } from 'zod';

export const createAttendanceSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
    date: z.string().min(1, 'Date is required'),
    clockInTime: z.string().optional(),
    clockOutTime: z.string().optional(),
    breakDuration: z.number().nonnegative().optional(),
    totalWorkedHours: z.number().nonnegative().optional(),
    overtimeHours: z.number().nonnegative().optional(),
    status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY', 'WEEKEND', 'LOP']).default('PRESENT'),
    isHoliday: z.boolean().optional(),
    isWeekend: z.boolean().optional(),
    isLeave: z.boolean().optional(),
    leaveType: z.string().optional(),
    notes: z.string().optional(),
    syncId: z.string().optional()
  })
});

export const updateAttendanceSchema = z.object({
  body: z.object({
    date: z.string().optional(),
    clockInTime: z.string().optional(),
    clockOutTime: z.string().optional(),
    breakDuration: z.number().nonnegative().optional(),
    totalWorkedHours: z.number().nonnegative().optional(),
    overtimeHours: z.number().nonnegative().optional(),
    status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY', 'WEEKEND', 'LOP']).optional(),
    isHoliday: z.boolean().optional(),
    isWeekend: z.boolean().optional(),
    isLeave: z.boolean().optional(),
    leaveType: z.string().optional(),
    notes: z.string().optional()
  })
});

export const attendanceQuerySchema = z.object({
  query: z.object({
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2020).max(2100).optional(),
    employeeId: z.string().uuid().optional(),
    status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY', 'WEEKEND', 'LOP']).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(1000).default(10)
  })
});

export const syncAttendanceSchema = z.object({
  body: z.object({
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required')
  })
});

export const attendanceIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid attendance ID format')
  })
});

export type CreateAttendanceBody = z.infer<typeof createAttendanceSchema>['body'];
export type UpdateAttendanceBody = z.infer<typeof updateAttendanceSchema>['body'];
export type AttendanceQuery = z.infer<typeof attendanceQuerySchema>['query'];
export type SyncAttendanceBody = z.infer<typeof syncAttendanceSchema>['body'];
