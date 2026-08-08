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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const email_1 = require("../lib/email");
const zod_1 = require("zod");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
// Max 5 reports per user/IP per 24 hours
const reportLimiter = (0, express_rate_limit_1.default)({
    windowMs: 24 * 60 * 60 * 1000,
    max: 5,
    message: { message: 'Too many reports submitted. Please try again tomorrow.' },
    keyGenerator: (req) => req.userId || req.ip || 'unknown'
});
const createReportSchema = zod_1.z.object({
    body: zod_1.z.object({
        targetId: zod_1.z.string().uuid('Valid target ID required.'),
        reason: zod_1.z.string().min(1, 'Reason is required.'),
        targetType: zod_1.z.enum(['user', 'listing', 'review'], { message: 'Invalid target type' }).optional()
    })
});
router.post('/', auth_1.protect, reportLimiter, (0, validate_1.validate)(createReportSchema), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { targetId, reason, targetType = 'user' } = req.body;
    const reporterId = req.userId;
    try {
        const report = yield prisma_1.prisma.report.create({
            data: {
                reporterId,
                targetType: targetType,
                targetId,
                reason,
                status: client_1.ReportStatus.pending
            }
        });
        // Check for auto-flagging
        const reportCount = yield prisma_1.prisma.report.count({
            where: { targetId, targetType: targetType }
        });
        let isAutoFlagged = false;
        if (reportCount >= 3) {
            if (targetType === 'user') {
                yield prisma_1.prisma.user.update({ where: { id: targetId }, data: { isFlagged: true } });
                isAutoFlagged = true;
            }
            else if (targetType === 'listing') {
                yield prisma_1.prisma.listing.update({ where: { id: targetId }, data: { isFlagged: true } });
                isAutoFlagged = true;
            }
        }
        // Send admin notification
        yield (0, email_1.sendAdminNotification)(`New Report Submitted (${targetType})`, `A new report was submitted.\n\nTarget ID: ${targetId}\nType: ${targetType}\nReason: ${reason}\n\nAuto-flagged: ${isAutoFlagged ? 'YES' : 'NO'} (Total reports: ${reportCount})`);
        res.status(201).json({ message: 'Report submitted successfully.', report, isAutoFlagged });
    }
    catch (err) {
        next(err);
    }
}));
exports.default = router;
