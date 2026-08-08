"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.loginSchema = exports.signupSchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("../constants");
exports.signupSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2, 'Name must be between 2 and 100 characters.').max(100, 'Name must be between 2 and 100 characters.'),
        email: zod_1.z.string().email('Please enter a valid email address.').toLowerCase(),
        phone: zod_1.z.string().min(5, 'Please enter a valid phone number.'),
        password: zod_1.z.string()
            .min(8, 'Password must be at least 8 characters.')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
            .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
            .regex(/\d/, 'Password must contain at least one number.'),
        tosAccepted: zod_1.z.boolean().refine(val => val === true, {
            message: 'You must accept the Terms of Service, Privacy Policy, and Damage Policy to create an account.'
        }),
        tosVersion: zod_1.z.string().optional().refine(val => !val || val === constants_1.CURRENT_TOS_VERSION, {
            message: `Invalid ToS version. Expected ${constants_1.CURRENT_TOS_VERSION}.`
        })
    })
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Please enter a valid email address.').toLowerCase(),
        password: zod_1.z.string().min(1, 'Password is required.')
    })
});
exports.forgotPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Please enter a valid email address.').toLowerCase()
    })
});
exports.resetPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        token: zod_1.z.string().min(1, 'Reset token is required.'),
        newPassword: zod_1.z.string()
            .min(8, 'Password must be at least 8 characters.')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
            .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
            .regex(/\d/, 'Password must contain at least one number.')
    })
});
