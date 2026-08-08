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
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
// ─── GET /api/admin/verifications — view pending verifications ────────────────
router.get('/verifications', auth_1.protect, auth_1.requireAdmin, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pendingUsers = yield prisma_1.prisma.user.findMany({
            where: { verificationStatus: client_1.VerificationStatus.pending },
            select: {
                id: true,
                name: true,
                email: true,
                idDocumentUrl: true,
                createdAt: true,
                resubmissionCount: true
            },
            orderBy: { updatedAt: 'asc' } // Oldest pending first
        });
        const { v2: cloudinary } = require('cloudinary');
        const mappedUsers = pendingUsers.map(user => {
            let signedUrl = user.idDocumentUrl;
            if (signedUrl && signedUrl.includes('cloudinary.com')) {
                // Extract public_id from full URL: e.g. "paperrentel_ids/abcd123"
                // URL format: https://res.cloudinary.com/<cloud>/image/upload/v1234/paperrentel_ids/abcd123.jpg
                const parts = signedUrl.split('/');
                const filePart = parts.pop() || '';
                const folderPart = parts.pop() || '';
                const publicId = `${folderPart}/${filePart.split('.')[0]}`;
                // Generate a signed URL valid for 1 hour
                signedUrl = cloudinary.utils.url(publicId, {
                    type: 'private',
                    sign_url: true,
                    secure: true
                });
            }
            return Object.assign(Object.assign({}, user), { idDocumentUrl: signedUrl });
        });
        res.status(200).json({ users: mappedUsers });
    }
    catch (err) {
        next(err);
    }
}));
// ─── PUT /api/admin/verifications/:userId — approve or reject ──────────────────
const verificationActionSchema = zod_1.z.object({
    body: zod_1.z.object({
        action: zod_1.z.enum(['approve', 'reject'], { message: 'Action must be approve or reject.' })
    })
});
router.put('/verifications/:userId', auth_1.protect, auth_1.requireAdmin, (0, validate_1.validate)(verificationActionSchema), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const { action } = req.body;
    try {
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            res.status(404).json({ message: 'User not found.' });
            return;
        }
        if (action === 'approve') {
            yield prisma_1.prisma.user.update({
                where: { id: userId },
                data: { verificationStatus: client_1.VerificationStatus.verified }
            });
            res.status(200).json({ message: 'User verified successfully.' });
            return;
        }
        if (action === 'reject') {
            // Check if user has already been rejected once (resubmissionCount === 1)
            if (user.resubmissionCount >= 1) {
                yield prisma_1.prisma.user.update({
                    where: { id: userId },
                    data: { verificationStatus: client_1.VerificationStatus.permanently_blocked }
                });
                res.status(200).json({ message: 'User permanently blocked after second rejection.' });
            }
            else {
                yield prisma_1.prisma.user.update({
                    where: { id: userId },
                    data: {
                        verificationStatus: client_1.VerificationStatus.rejected,
                        resubmissionCount: 1 // Increment/set resubmission count
                    }
                });
                res.status(200).json({ message: 'User verification rejected. They can re-upload once.' });
            }
            return;
        }
    }
    catch (err) {
        next(err);
    }
}));
// ─── ADMIN DASHBOARD: STATS ────────────────────────────────────────────────────
router.get('/stats', auth_1.protect, auth_1.requireAdmin, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const totalUsers = yield prisma_1.prisma.user.count();
        const totalListings = yield prisma_1.prisma.listing.count({ where: { status: 'active' } });
        const activeBookings = yield prisma_1.prisma.booking.count({ where: { status: { in: ['confirmed', 'ongoing'] } } });
        // Revenue-to-be (transaction volume of active bookings)
        const bookings = yield prisma_1.prisma.booking.findMany({
            where: { status: { in: ['confirmed', 'ongoing'] } },
            select: { totalPrice: true }
        });
        const projectedRevenue = bookings.reduce((sum, b) => sum + Number(b.totalPrice), 0);
        res.json({ totalUsers, totalListings, activeBookings, projectedRevenue });
    }
    catch (err) {
        next(err);
    }
}));
// ─── ADMIN DASHBOARD: USERS ────────────────────────────────────────────────────
router.get('/users', auth_1.protect, auth_1.requireAdmin, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { search = '', page = '1', limit = '50' } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = search ? {
            OR: [
                { name: { contains: String(search), mode: 'insensitive' } },
                { email: { contains: String(search), mode: 'insensitive' } }
            ]
        } : {};
        const [users, total] = yield Promise.all([
            prisma_1.prisma.user.findMany({
                where,
                select: {
                    id: true, name: true, email: true, isAdmin: true,
                    isSuspended: true, verificationStatus: true,
                    createdAt: true, isFlagged: true
                },
                skip,
                take: Number(limit),
                orderBy: { createdAt: 'desc' }
            }),
            prisma_1.prisma.user.count({ where })
        ]);
        res.json({ users, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
    }
    catch (err) {
        next(err);
    }
}));
const suspendUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        isSuspended: zod_1.z.boolean()
    })
});
router.put('/users/:id/suspend', auth_1.protect, auth_1.requireAdmin, (0, validate_1.validate)(suspendUserSchema), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { isSuspended } = req.body;
        const user = yield prisma_1.prisma.user.update({
            where: { id: req.params.id },
            data: { isSuspended: Boolean(isSuspended) },
            select: { id: true, isSuspended: true }
        });
        res.json({ message: 'User suspension status updated', user });
    }
    catch (err) {
        next(err);
    }
}));
// ─── ADMIN DASHBOARD: LISTINGS ─────────────────────────────────────────────────
router.get('/listings', auth_1.protect, auth_1.requireAdmin, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = '1', limit = '50' } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const [listings, total] = yield Promise.all([
            prisma_1.prisma.listing.findMany({
                include: { owner: { select: { name: true, email: true } } },
                skip,
                take: Number(limit),
                orderBy: { createdAt: 'desc' }
            }),
            prisma_1.prisma.listing.count()
        ]);
        res.json({ listings, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
    }
    catch (err) {
        next(err);
    }
}));
const updateListingStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(['active', 'removed', 'paused'])
    })
});
router.put('/listings/:id/status', auth_1.protect, auth_1.requireAdmin, (0, validate_1.validate)(updateListingStatusSchema), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status } = req.body;
        const listing = yield prisma_1.prisma.listing.update({
            where: { id: req.params.id },
            data: { status }
        });
        res.json({ message: 'Listing status updated', listing });
    }
    catch (err) {
        next(err);
    }
}));
// ─── ADMIN DASHBOARD: REPORTS ──────────────────────────────────────────────────
router.get('/reports', auth_1.protect, auth_1.requireAdmin, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = '1', limit = '50' } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const [reports, total] = yield Promise.all([
            prisma_1.prisma.report.findMany({
                include: { reporter: { select: { name: true, email: true } } },
                skip,
                take: Number(limit),
                orderBy: { createdAt: 'desc' }
            }),
            prisma_1.prisma.report.count()
        ]);
        res.json({ reports, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
    }
    catch (err) {
        next(err);
    }
}));
const updateReportStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(['pending', 'reviewed', 'dismissed', 'actioned'])
    })
});
router.put('/reports/:id/status', auth_1.protect, auth_1.requireAdmin, (0, validate_1.validate)(updateReportStatusSchema), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status } = req.body;
        const report = yield prisma_1.prisma.report.update({
            where: { id: req.params.id },
            data: { status }
        });
        res.json({ message: 'Report status updated', report });
    }
    catch (err) {
        next(err);
    }
}));
// ─── ADMIN DASHBOARD: BOOKINGS ─────────────────────────────────────────────────
router.get('/bookings', auth_1.protect, auth_1.requireAdmin, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = '1', limit = '50' } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const [bookings, total] = yield Promise.all([
            prisma_1.prisma.booking.findMany({
                include: {
                    renter: { select: { name: true, email: true } },
                    owner: { select: { name: true, email: true } },
                    listing: { select: { title: true } }
                },
                skip,
                take: Number(limit),
                orderBy: { createdAt: 'desc' }
            }),
            prisma_1.prisma.booking.count()
        ]);
        res.json({ bookings, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
    }
    catch (err) {
        next(err);
    }
}));
// ─── ADMIN DASHBOARD: DISPUTES ────────────────────────────────────────────────
router.get('/disputes', auth_1.protect, auth_1.requireAdmin, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = '1', limit = '50' } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const [disputes, total] = yield Promise.all([
            prisma_1.prisma.disputeClaim.findMany({
                include: {
                    filedBy: { select: { id: true, name: true, email: true } },
                    booking: {
                        include: {
                            renter: { select: { id: true, name: true, email: true } },
                            owner: { select: { id: true, name: true, email: true } },
                            listing: { select: { id: true, title: true } }
                        }
                    }
                },
                skip,
                take: Number(limit),
                orderBy: { createdAt: 'desc' }
            }),
            prisma_1.prisma.disputeClaim.count()
        ]);
        res.json({ disputes, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
    }
    catch (err) {
        next(err);
    }
}));
const resolveDisputeSchema = zod_1.z.object({
    body: zod_1.z.object({
        action: zod_1.z.enum(['release', 'forfeit', 'partially_withhold']),
        amount: zod_1.z.number().optional(),
        resolutionNotes: zod_1.z.string().optional()
    })
});
router.put('/disputes/:id/resolve', auth_1.protect, auth_1.requireAdmin, (0, validate_1.validate)(resolveDisputeSchema), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { action, amount, resolutionNotes } = req.body;
        const dispute = yield prisma_1.prisma.disputeClaim.findUnique({
            where: { id: req.params.id },
            include: { booking: true }
        });
        if (!dispute) {
            res.status(404).json({ message: 'Dispute not found.' });
            return;
        }
        if (dispute.status === 'resolved') {
            res.status(400).json({ message: 'Dispute is already resolved.' });
            return;
        }
        let depositStatus = 'held';
        let resolutionAmount = 0;
        if (action === 'release') {
            depositStatus = 'released'; // Full refund to renter
        }
        else if (action === 'forfeit') {
            depositStatus = 'forfeited'; // Full forfeit to owner
            resolutionAmount = Number(dispute.booking.depositAmount);
        }
        else if (action === 'partially_withhold') {
            depositStatus = 'partially_withheld';
            resolutionAmount = Number(amount);
            if (!resolutionAmount || resolutionAmount <= 0 || resolutionAmount > Number(dispute.booking.depositAmount)) {
                res.status(400).json({ message: 'Invalid partial withhold amount.' });
                return;
            }
        }
        // Atomic transaction to update both dispute and booking
        const result = yield prisma_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const updatedDispute = yield tx.disputeClaim.update({
                where: { id: dispute.id },
                data: {
                    status: 'resolved',
                    resolutionNotes,
                    depositResolutionAmount: resolutionAmount,
                    resolvedAt: new Date()
                }
            });
            yield tx.booking.update({
                where: { id: dispute.bookingId },
                data: {
                    depositStatus,
                    status: 'completed' // Force booking to completed once dispute is settled
                }
            });
            return updatedDispute;
        }));
        // TODO: Trigger notification to both parties about the resolution
        res.json({ message: 'Dispute resolved successfully', dispute: result });
    }
    catch (err) {
        next(err);
    }
}));
exports.default = router;
