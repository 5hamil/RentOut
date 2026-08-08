"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingLimiter = exports.authLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Strict rate limit for auth (Login, Register) - 10 requests per 15 mins
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: 'Too many authentication attempts, please try again after 15 minutes.' },
    keyGenerator: (req) => req.ip || 'unknown'
});
// Moderate limit for booking requests - 10 requests per hour
exports.bookingLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { message: 'Too many booking requests. Please try again later.' },
    keyGenerator: (req) => req.userId || req.ip || 'unknown'
});
