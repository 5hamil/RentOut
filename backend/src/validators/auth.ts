import { z } from 'zod';
import { CURRENT_TOS_VERSION } from '../constants';

export const signupSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be between 2 and 100 characters.').max(100, 'Name must be between 2 and 100 characters.'),
    email: z.string().email('Please enter a valid email address.').toLowerCase(),
    phone: z.string().min(5, 'Please enter a valid phone number.'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters.')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
      .regex(/\d/, 'Password must contain at least one number.'),
    tosAccepted: z.boolean().refine(val => val === true, {
      message: 'You must accept the Terms of Service, Privacy Policy, and Damage Policy to create an account.'
    }),
    tosVersion: z.string().optional().refine(val => !val || val === CURRENT_TOS_VERSION, {
      message: `Invalid ToS version. Expected ${CURRENT_TOS_VERSION}.`
    })
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Please enter a valid email address.').toLowerCase(),
    password: z.string().min(1, 'Password is required.')
  })
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Please enter a valid email address.').toLowerCase()
  })
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required.'),
    newPassword: z.string()
      .min(8, 'Password must be at least 8 characters.')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
      .regex(/\d/, 'Password must contain at least one number.')
  })
});
