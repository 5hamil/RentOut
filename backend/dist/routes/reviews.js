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
const createReviewSchema = zod_1.z.object({
    body: zod_1.z.object({
        bookingId: zod_1.z.string().uuid('Valid booking ID required.'),
        rating: zod_1.z.number().int().min(1).max(5, 'Rating must be between 1 and 5.'),
        comment: zod_1.z.string().min(1, 'Comment is required.')
    })
});
router.post('/', auth_1.protect, (0, validate_1.validate)(createReviewSchema), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { bookingId, rating, comment } = req.body;
    const reviewerId = req.userId;
    try {
        // 1. Find booking
        const booking = yield prisma_1.prisma.booking.findUnique({
            where: { id: bookingId }
        });
        if (!booking) {
            res.status(404).json({ message: 'Booking not found.' });
            return;
        }
        // 2. Ensure booking is completed
        if (booking.status !== client_1.BookingStatus.completed) {
            res.status(400).json({ message: 'You can only review completed bookings.' });
            return;
        }
        // 3. Ensure user is part of the booking
        if (booking.renterId !== reviewerId && booking.ownerId !== reviewerId) {
            res.status(403).json({ message: 'You are not authorized to review this booking.' });
            return;
        }
        const revieweeId = booking.renterId === reviewerId ? booking.ownerId : booking.renterId;
        // 4. Ensure user hasn't already left a review
        const existingReview = yield prisma_1.prisma.review.findUnique({
            where: {
                bookingId_reviewerId: {
                    bookingId,
                    reviewerId
                }
            }
        });
        if (existingReview) {
            res.status(400).json({ message: 'You have already left a review for this booking.' });
            return;
        }
        // 5. Create review and update user's average rating transactionally
        yield prisma_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            yield tx.review.create({
                data: {
                    bookingId,
                    reviewerId,
                    revieweeId,
                    rating,
                    comment
                }
            });
            const avgQuery = yield tx.review.aggregate({
                where: { revieweeId },
                _avg: { rating: true }
            });
            if (avgQuery._avg.rating) {
                yield tx.user.update({
                    where: { id: revieweeId },
                    data: { avgRating: avgQuery._avg.rating }
                });
            }
        }));
        res.status(201).json({ message: 'Review submitted successfully.' });
    }
    catch (err) {
        next(err);
    }
}));
exports.default = router;
