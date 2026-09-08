import { z } from 'zod';

export const jibblePayslipIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Jibble payslip ID format'),
  }),
});