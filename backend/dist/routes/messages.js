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
const index_1 = require("../index");
const zod_1 = require("zod");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
// Middleware to verify user is part of the booking
const verifyBookingParticipant = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { bookingId } = req.params;
    try {
        const booking = yield prisma_1.prisma.booking.findUnique({
            where: { id: bookingId }
        });
        if (!booking) {
            res.status(404).json({ message: 'Booking not found.' });
            return;
        }
        if (booking.renterId !== req.userId && booking.ownerId !== req.userId) {
            res.status(403).json({ message: 'Not authorized to access this chat.' });
            return;
        }
        // Pass booking along to avoid re-querying
        req.booking = booking;
        next();
    }
    catch (err) {
        next(err);
    }
});
// ─── GET /api/messages/:bookingId — fetch chat history ────────────────────────
router.get('/:bookingId', auth_1.protect, verifyBookingParticipant, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { bookingId } = req.params;
    try {
        const messages = yield prisma_1.prisma.message.findMany({
            where: { bookingId },
            orderBy: { createdAt: 'asc' }, // Oldest to newest
            include: {
                sender: { select: { id: true, name: true, profileImage: true } }
            }
        });
        res.status(200).json({ messages });
    }
    catch (err) {
        next(err);
    }
}));
// ─── POST /api/messages/:bookingId — send a message ───────────────────────────
const sendMessageSchema = zod_1.z.object({
    body: zod_1.z.object({
        content: zod_1.z.string().min(1, 'Message content cannot be empty.')
    })
});
router.post('/:bookingId', auth_1.protect, verifyBookingParticipant, (0, validate_1.validate)(sendMessageSchema), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { bookingId } = req.params;
    const { content } = req.body;
    try {
        const message = yield prisma_1.prisma.message.create({
            data: {
                bookingId,
                senderId: req.userId,
                content
            },
            include: {
                sender: { select: { id: true, name: true, profileImage: true } }
            }
        });
        // Broadcast the new message to everyone in the room
        index_1.io.to(`booking:${bookingId}`).emit('receive_message', message);
        res.status(201).json({ message });
    }
    catch (err) {
        next(err);
    }
}));
exports.default = router;
