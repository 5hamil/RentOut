"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const hash_1 = require("../utils/hash");
const jwt_1 = require("../utils/jwt");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const rateLimiters_1 = require("../lib/rateLimiters");
const auth_2 = require("../validators/auth");
const constants_1 = require("../constants");
const router = (0, express_1.Router)();
// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
/** Return only the fields safe to expose in API responses. */
const safeUser = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    profileImage: user.profileImage,
    avgRating: user.avgRating,
    verificationStatus: user.verificationStatus,
    resubmissionCount: user.resubmissionCount,
    isAdmin: user.isAdmin,
    tosAcceptedAt: user.tosAcceptedAt,
    tosVersion: user.tosVersion,
    createdAt: user.createdAt,
});
const USER_SELECT = {
    id: true,
    name: true,
    email: true,
    phone: true,
    profileImage: true,
    avgRating: true,
    verificationStatus: true,
    resubmissionCount: true,
    isAdmin: true,
    tosAcceptedAt: true,
    tosVersion: true,
    createdAt: true,
    // Omitted: passwordHash, idDocumentUrl, refreshTokens, etc.
};
/** Set the refresh token as an HttpOnly cookie. */
const setRefreshCookie = (res, token) => {
    res.cookie(constants_1.COOKIE_NAME_REFRESH, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: constants_1.REFRESH_TOKEN_EXPIRY_MS,
        path: '/api/auth', // scoped — cookie only sent to /api/auth/* routes
    });
};
/** Clear the refresh token cookie. */
const clearRefreshCookie = (res) => {
    res.clearCookie(constants_1.COOKIE_NAME_REFRESH, { path: '/api/auth' });
};
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/signup
// ─────────────────────────────────────────────────────────────────────────────
router.post('/signup', rateLimiters_1.authLimiter, (0, validate_1.validate)(auth_2.signupSchema), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, phone, password, tosAccepted, tosVersion } = req.body;
    // Guard — double-check ToS (belt + suspenders beyond validator)
    if (!tosAccepted || tosAccepted === 'false') {
        res.status(400).json({
            message: 'You must accept the Terms of Service, Privacy Policy, and Damage Policy.',
            errors: [{ field: 'tosAccepted', message: 'ToS acceptance is required.' }],
        });
        return;
    }
    try {
        // Check for existing user
        const existing = yield prisma_1.prisma.user.findFirst({
            where: { OR: [{ email }, { phone }] },
            select: { email: true, phone: true },
        });
        if (existing) {
            const field = existing.email === email ? 'email' : 'phone';
            res.status(409).json({
                message: `An account with this ${field} already exists.`,
                errors: [{ field, message: `This ${field} is already registered.` }],
            });
            return;
        }
        const passwordHash = yield (0, hash_1.hashPassword)(password);
        const user = yield prisma_1.prisma.user.create({
            data: {
                name,
                email,
                phone,
                passwordHash,
                verificationStatus: 'unverified',
                tosAcceptedAt: new Date(),
                tosVersion: tosVersion || constants_1.CURRENT_TOS_VERSION,
            },
            select: USER_SELECT,
        });
        // Issue tokens
        const accessToken = (0, jwt_1.generateAccessToken)(user.id);
        const refreshToken = (0, jwt_1.generateRefreshToken)(user.id);
        yield prisma_1.prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash: (0, hash_1.hashToken)(refreshToken),
                expiresAt: new Date(Date.now() + constants_1.REFRESH_TOKEN_EXPIRY_MS),
            },
        });
        setRefreshCookie(res, refreshToken);
        res.status(201).json({
            message: 'Account created successfully.',
            user: safeUser(user),
            accessToken,
        });
    }
    catch (err) {
        next(err);
    }
}));
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', rateLimiters_1.authLimiter, (0, validate_1.validate)(auth_2.loginSchema), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        const user = yield prisma_1.prisma.user.findUnique({
            where: { email },
            select: Object.assign(Object.assign({}, USER_SELECT), { passwordHash: true }),
        });
        // Use a constant-time response to prevent user enumeration
        const passwordMatch = user ? yield (0, hash_1.comparePassword)(password, user.passwordHash) : false;
        if (!user || !passwordMatch) {
            res.status(401).json({ message: 'Invalid email or password.' });
            return;
        }
        if (user.verificationStatus === 'permanently_blocked') {
            res.status(403).json({
                message: 'This account has been permanently suspended. Please contact support.',
                code: 'ACCOUNT_BLOCKED',
            });
            return;
        }
        const accessToken = (0, jwt_1.generateAccessToken)(user.id);
        const refreshToken = (0, jwt_1.generateRefreshToken)(user.id);
        yield prisma_1.prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash: (0, hash_1.hashToken)(refreshToken),
                expiresAt: new Date(Date.now() + constants_1.REFRESH_TOKEN_EXPIRY_MS),
            },
        });
        setRefreshCookie(res, refreshToken);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash: _ } = user, safeData = __rest(user, ["passwordHash"]);
        res.status(200).json({
            message: 'Login successful.',
            user: safeUser(safeData),
            accessToken,
        });
    }
    catch (err) {
        next(err);
    }
}));
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// Rotates the refresh token (old one is invalidated, new one is issued).
// ─────────────────────────────────────────────────────────────────────────────
router.post('/refresh', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a[constants_1.COOKIE_NAME_REFRESH];
    if (!token) {
        res.status(401).json({ message: 'No refresh token provided.' });
        return;
    }
    try {
        const payload = (0, jwt_1.verifyRefreshToken)(token);
        const tokenHash = (0, hash_1.hashToken)(token);
        const stored = yield prisma_1.prisma.refreshToken.findUnique({ where: { tokenHash } });
        if (!stored || stored.userId !== payload.sub || stored.expiresAt < new Date()) {
            clearRefreshCookie(res);
            res.status(401).json({ message: 'Refresh token is invalid or expired. Please log in again.' });
            return;
        }
        // Rotate: delete old token, issue new pair
        yield prisma_1.prisma.refreshToken.delete({ where: { tokenHash } });
        const newAccessToken = (0, jwt_1.generateAccessToken)(payload.sub);
        const newRefreshToken = (0, jwt_1.generateRefreshToken)(payload.sub);
        yield prisma_1.prisma.refreshToken.create({
            data: {
                userId: payload.sub,
                tokenHash: (0, hash_1.hashToken)(newRefreshToken),
                expiresAt: new Date(Date.now() + constants_1.REFRESH_TOKEN_EXPIRY_MS),
            },
        });
        setRefreshCookie(res, newRefreshToken);
        res.status(200).json({ accessToken: newAccessToken });
    }
    catch (err) {
        clearRefreshCookie(res);
        res.status(401).json({ message: 'Refresh token is invalid or expired. Please log in again.' });
    }
}));
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a[constants_1.COOKIE_NAME_REFRESH];
    if (token) {
        try {
            yield prisma_1.prisma.refreshToken.deleteMany({ where: { tokenHash: (0, hash_1.hashToken)(token) } });
        }
        catch (_b) {
            // If token not found in DB, that's fine — still clear the cookie
        }
    }
    clearRefreshCookie(res);
    res.status(200).json({ message: 'Logged out successfully.' });
}));
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me  (protected)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: req.userId },
            select: USER_SELECT,
        });
        if (!user) {
            res.status(404).json({ message: 'User not found.' });
            return;
        }
        res.status(200).json({ user: safeUser(user) });
    }
    catch (err) {
        console.error('[GET /auth/me]', err);
        res.status(500).json({ message: 'Something went wrong.' });
    }
}));
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────────────────────────────────────
router.post('/forgot-password', rateLimiters_1.authLimiter, (0, validate_1.validate)(auth_2.forgotPasswordSchema), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Generic response — never reveal whether the email exists
    const GENERIC_MSG = 'If an account with that email exists, a password reset link has been sent.';
    const { email } = req.body;
    try {
        const user = yield prisma_1.prisma.user.findUnique({ where: { email }, select: { id: true } });
        if (user) {
            // Invalidate any existing unused reset tokens for this user
            yield prisma_1.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, used: false } });
            const rawToken = (0, hash_1.generateSecureToken)();
            const tokenHash = (0, hash_1.hashToken)(rawToken);
            yield prisma_1.prisma.passwordResetToken.create({
                data: {
                    userId: user.id,
                    tokenHash,
                    expiresAt: new Date(Date.now() + constants_1.PASSWORD_RESET_EXPIRY_MS),
                },
            });
            // TODO: In production, send this via email (e.g. SendGrid, Resend, Nodemailer).
            // The reset URL should be: ${FRONTEND_URL}/reset-password?token=${rawToken}
            if (process.env.NODE_ENV !== 'production') {
                console.log(`\n🔑 [DEV] Password reset token for ${email}:\n${rawToken}\n`);
            }
        }
        res.status(200).json({ message: GENERIC_MSG });
    }
    catch (err) {
        next(err);
    }
}));
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reset-password', rateLimiters_1.authLimiter, (0, validate_1.validate)(auth_2.resetPasswordSchema), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { token, newPassword: password } = req.body;
    try {
        const tokenHash = (0, hash_1.hashToken)(token);
        const resetToken = yield prisma_1.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
        if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
            res.status(400).json({
                message: 'This password reset link is invalid or has expired. Please request a new one.',
            });
            return;
        }
        const newPasswordHash = yield (0, hash_1.hashPassword)(password);
        // Update password, mark token as used, and invalidate all refresh tokens
        yield prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({
                where: { id: resetToken.userId },
                data: { passwordHash: newPasswordHash },
            }),
            prisma_1.prisma.passwordResetToken.update({
                where: { tokenHash },
                data: { used: true },
            }),
            // Force all devices to re-authenticate
            prisma_1.prisma.refreshToken.deleteMany({ where: { userId: resetToken.userId } }),
        ]);
        res.status(200).json({ message: 'Password reset successfully. Please log in with your new password.' });
    }
    catch (err) {
        next(err);
    }
}));
exports.default = router;
