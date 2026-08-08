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
const cloudinary_1 = require("../lib/cloudinary");
const email_1 = require("../lib/email");
const router = (0, express_1.Router)();
// ─── POST /api/bookings/:id/dispute — File a new dispute ─────────────────────
router.post('/bookings/:bookingId/dispute', auth_1.protect, cloudinary_1.uploadEvidence.array('images', 5), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { bookingId } = req.params;
    const { reason } = req.body;
    if (!reason) {
        res.status(400).json({ message: 'Reason is required.' });
        return;
    }
    try {
        const booking = yield prisma_1.prisma.booking.findUnique({
            where: { id: bookingId }
        });
        if (!booking) {
            res.status(404).json({ message: 'Booking not found.' });
            return;
        }
        if (booking.renterId !== req.userId && booking.ownerId !== req.userId) {
            res.status(403).json({ message: 'You are not a party to this booking.' });
            return;
        }
        if (!['completed', 'ongoing'].includes(booking.status)) {
            res.status(400).json({ message: 'Can only dispute ongoing or completed bookings.' });
            return;
        }
        const existingDispute = yield prisma_1.prisma.disputeClaim.findUnique({
            where: { bookingId }
        });
        if (existingDispute) {
            res.status(400).json({ message: 'Dispute already filed for this booking.' });
            return;
        }
        // Extract image URLs
        const files = req.files;
        const imageUrls = files ? files.map(f => f.path) : [];
        // Create the dispute and update booking status atomically
        const result = yield prisma_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const dispute = yield tx.disputeClaim.create({
                data: {
                    bookingId,
                    filedById: req.userId,
                    reason,
                    evidenceImages: imageUrls,
                    status: 'open'
                }
            });
            yield tx.booking.update({
                where: { id: bookingId },
                data: { status: 'disputed' }
            });
            return dispute;
        }));
        // Trigger notification to opposing party and Admin
        yield (0, email_1.sendAdminNotification)('New Dispute Filed', `A new dispute was filed by user ${req.userId} on booking ${bookingId}.\n\nReason: ${reason}`);
        res.status(201).json({ message: 'Dispute filed successfully', dispute: result });
    }
    catch (err) {
        console.error('[POST /api/bookings/:id/dispute]', err);
        res.status(500).json({ message: 'Failed to file dispute.' });
    }
}));
// ─── POST /api/disputes/:id/counter — Counter-file evidence ──────────────────
router.post('/disputes/:disputeId/counter', auth_1.protect, cloudinary_1.uploadEvidence.array('images', 5), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { disputeId } = req.params;
    const { opposingReason } = req.body;
    if (!opposingReason) {
        res.status(400).json({ message: 'Reason is required.' });
        return;
    }
    try {
        const dispute = yield prisma_1.prisma.disputeClaim.findUnique({
            where: { id: disputeId },
            include: { booking: true }
        });
        if (!dispute) {
            res.status(404).json({ message: 'Dispute not found.' });
            return;
        }
        const isOwner = dispute.booking.ownerId === req.userId;
        const isRenter = dispute.booking.renterId === req.userId;
        if (!isOwner && !isRenter) {
            res.status(403).json({ message: 'Not authorized.' });
            return;
        }
        if (dispute.filedById === req.userId) {
            res.status(400).json({ message: 'You already filed the primary claim.' });
            return;
        }
        if (dispute.opposingReason) {
            res.status(400).json({ message: 'Counter-evidence already submitted.' });
            return;
        }
        const files = req.files;
        const imageUrls = files ? files.map(f => f.path) : [];
        const updated = yield prisma_1.prisma.disputeClaim.update({
            where: { id: disputeId },
            data: {
                opposingReason,
                opposingEvidenceImages: imageUrls,
                status: 'under_review' // move it to under review automatically
            }
        });
        // Trigger notification to original filer and Admin
        yield (0, email_1.sendAdminNotification)('Dispute Counter-Evidence Submitted', `Counter-evidence was submitted by user ${req.userId} on dispute ${disputeId}.\n\nReason: ${opposingReason}`);
        res.status(200).json({ message: 'Counter-evidence submitted successfully', dispute: updated });
    }
    catch (err) {
        console.error('[POST /api/disputes/:id/counter]', err);
        res.status(500).json({ message: 'Failed to submit counter evidence.' });
    }
}));
exports.default = router;
