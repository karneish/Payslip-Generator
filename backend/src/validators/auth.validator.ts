import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    rememberMe: z.boolean().optional()
  })
});

export const changePasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    currentPassword: z.string().min(6, 'Password must be at least 6 characters'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters')
  })
});

export type LoginBody = z.infer<typeof loginSchema>['body'];
export type ChangePasswordBody = z.infer<typeof changePasswordSchema>['body'];
