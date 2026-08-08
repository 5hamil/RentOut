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
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.requireVerified = exports.protect = void 0;
const jwt_1 = require("../utils/jwt");
const prisma_1 = require("../lib/prisma");
/**
 * Protect — verifies the Bearer access token on every protected route.
 * Attaches `req.userId` for downstream handlers.
 */
const protect = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
        res.status(401).json({ message: 'Authentication required. Please log in.' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = (0, jwt_1.verifyAccessToken)(token);
        req.userId = payload.sub;
        next();
    }
    catch (_a) {
        res.status(401).json({ message: 'Access token expired or invalid. Please refresh your session.' });
    }
};
exports.protect = protect;
/**
 * requireVerified — must be chained AFTER `protect`.
 * Rejects the request if the user has not completed ID verification.
 * This gates actions like creating a listing or requesting a booking.
 */
const requireVerified = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.userId) {
        res.status(401).json({ message: 'Authentication required.' });
        return;
    }
    const user = yield prisma_1.prisma.user.findUnique({
        where: { id: req.userId },
        select: { verificationStatus: true },
    });
    if (!user) {
        res.status(404).json({ message: 'User not found.' });
        return;
    }
    if (user.verificationStatus !== 'verified') {
        res.status(403).json({
            message: 'ID verification is required to perform this action.',
            code: 'VERIFICATION_REQUIRED',
            verificationStatus: user.verificationStatus,
        });
        return;
    }
    next();
});
exports.requireVerified = requireVerified;
/**
 * requireAdmin — must be chained AFTER `protect`.
 * Rejects the request if the user is not an admin.
 */
const requireAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.userId) {
        res.status(401).json({ message: 'Authentication required.' });
        return;
    }
    const user = yield prisma_1.prisma.user.findUnique({
        where: { id: req.userId },
        select: { isAdmin: true },
    });
    if (!user || !user.isAdmin) {
        res.status(403).json({ message: 'Admin access required.' });
        return;
    }
    next();
});
exports.requireAdmin = requireAdmin;
