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
const rateLimiters_1 = require("../lib/rateLimiters");
const router = (0, express_1.Router)();
// ─── POST /api/bookings — create a booking request ────────────────────────────
const createBookingSchema = zod_1.z.object({
    body: zod_1.z.object({
        listingId: zod_1.z.string().uuid('Invalid listing ID.'),
        startDate: zod_1.z.string().datetime({ message: 'Valid start date is required.' }),
        endDate: zod_1.z.string().datetime({ message: 'Valid end date is required.' }),
    }).refine(data => new Date(data.endDate) > new Date(data.startDate), {
        message: 'End date must be after start date.',
        path: ['endDate']
    })
});
router.post('/', auth_1.protect, auth_1.requireVerified, rateLimiters_1.bookingLimiter, (0, validate_1.validate)(createBookingSchema), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { listingId, startDate, endDate } = req.body;
    const reqStart = new Date(startDate);
    const reqEnd = new Date(endDate);
    try {
        // 1. Fetch listing and its existing confirmed/ongoing bookings
        const listing = yield prisma_1.prisma.listing.findUnique({
            where: { id: listingId },
            include: {
                bookings: {
                    where: {
                        status: { in: [client_1.BookingStatus.confirmed, client_1.BookingStatus.ongoing] }
                    },
                    select: { startDate: true, endDate: true }
                }
            }
        });
        if (!listing) {
            res.status(404).json({ message: 'Listing not found.' });
            return;
        }
        if (listing.status !== client_1.ListingStatus.active) {
            res.status(400).json({ message: 'This listing is not currently active.' });
            return;
        }
        // 2. Prevent booking own listing
        if (listing.ownerId === req.userId) {
            res.status(400).json({ message: 'You cannot book your own listing.' });
            return;
        }
        // 3. Check if requested dates fall within the overall availability window
        if (reqStart < listing.availabilityStart || reqEnd > listing.availabilityEnd) {
            res.status(400).json({ message: 'Requested dates fall outside the listing\'s available window.' });
            return;
        }
        // 4. Overlap Check: blockedDates
        const hasBlockedOverlap = listing.blockedDates.some(blocked => {
            const bTime = blocked.getTime();
            return bTime >= reqStart.getTime() && bTime <= reqEnd.getTime();
        });
        if (hasBlockedOverlap) {
            res.status(400).json({ message: 'Some of the requested dates are blocked by the owner.' });
            return;
        }
        // 5. Overlap Check: existing bookings
        // Two ranges (StartA, EndA) and (StartB, EndB) overlap if: StartA < EndB AND EndA > StartB
        // We'll treat rental days as inclusive (e.g. rent from Monday to Tuesday overlaps if someone booked Monday or Tuesday)
        const hasBookingOverlap = listing.bookings.some(booking => {
            return (reqStart <= booking.endDate && reqEnd >= booking.startDate);
        });
        if (hasBookingOverlap) {
            res.status(400).json({ message: 'Some of the requested dates are already booked.' });
            return;
        }
        // 6. Calculate Pricing
        // Calculate full days. Math.ceil is safer for potential timezone quirks, but since we use ISO strings at 00:00:00Z, simple subtraction works.
        const msPerDay = 1000 * 60 * 60 * 24;
        const diffMs = reqEnd.getTime() - reqStart.getTime();
        // Inclusive counting: renting 20th to 20th is 1 day. 20th to 21st is 2 days.
        const days = Math.round(diffMs / msPerDay) + 1;
        if (days < 1) {
            res.status(400).json({ message: 'Invalid date range.' });
            return;
        }
        const pricePerDay = Number(listing.pricePerDay);
        const depositAmount = Number(listing.depositAmount);
        const totalPrice = days * pricePerDay;
        // 7. Create the booking request
        const booking = yield prisma_1.prisma.booking.create({
            data: {
                listingId,
                renterId: req.userId,
                ownerId: listing.ownerId,
                startDate: reqStart,
                endDate: reqEnd,
                totalPrice,
                depositAmount,
                status: client_1.BookingStatus.requested,
                depositStatus: client_1.DepositStatus.held // assuming payment processor holds it upon request
            }
        });
        res.status(201).json({ message: 'Booking request sent successfully.', booking });
    }
    catch (err) {
        next(err);
    }
}));
// ─── GET /api/bookings/owner — get bookings where user is owner ─────────────
router.get('/owner', auth_1.protect, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const bookings = yield prisma_1.prisma.booking.findMany({
            where: { ownerId: req.userId },
            orderBy: { createdAt: 'desc' },
            include: {
                listing: { select: { id: true, title: true, images: true } },
                renter: { select: { id: true, name: true, profileImage: true, avgRating: true } },
                reviews: true,
                dispute: true
            }
        });
        res.status(200).json({ bookings });
    }
    catch (err) {
        next(err);
    }
}));
// ─── GET /api/bookings/renter — get bookings where user is renter ───────────
router.get('/renter', auth_1.protect, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const bookings = yield prisma_1.prisma.booking.findMany({
            where: { renterId: req.userId },
            orderBy: { createdAt: 'desc' },
            include: {
                listing: { select: { id: true, title: true, images: true } },
                owner: { select: { id: true, name: true, profileImage: true, avgRating: true } },
                reviews: true,
                dispute: true
            }
        });
        res.status(200).json({ bookings });
    }
    catch (err) {
        next(err);
    }
}));
// ─── PUT /api/bookings/:id/status — accept or decline a booking request ──────
const updateStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        action: zod_1.z.enum(['accept', 'decline', 'complete'], {
            message: 'Action must be accept, decline, or complete.'
        })
    })
});
router.put('/:id/status', auth_1.protect, auth_1.requireVerified, (0, validate_1.validate)(updateStatusSchema), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { action } = req.body;
    try {
        // 1. Find booking
        const booking = yield prisma_1.prisma.booking.findUnique({
            where: { id },
            include: { listing: true, renter: true }
        });
        if (!booking) {
            res.status(404).json({ message: 'Booking not found.' });
            return;
        }
        // 2. Ensure current user is the owner
        if (booking.ownerId !== req.userId) {
            res.status(403).json({ message: 'Only the owner can manage this booking.' });
            return;
        }
        // 3. Handle Actions
        if (action === 'decline') {
            if (booking.status !== client_1.BookingStatus.requested) {
                res.status(400).json({ message: 'Can only decline a requested booking.' });
                return;
            }
            const updated = yield prisma_1.prisma.booking.update({
                where: { id },
                data: { status: client_1.BookingStatus.cancelled }
            });
            res.status(200).json({ message: 'Booking declined.', booking: updated });
            return;
        }
        if (action === 'accept') {
            if (booking.status !== client_1.BookingStatus.requested) {
                res.status(400).json({ message: 'Can only accept a requested booking.' });
                return;
            }
            const existingOverlap = yield prisma_1.prisma.booking.findFirst({
                where: {
                    listingId: booking.listingId,
                    status: { in: [client_1.BookingStatus.confirmed, client_1.BookingStatus.ongoing] },
                    startDate: { lte: booking.endDate },
                    endDate: { gte: booking.startDate }
                }
            });
            if (existingOverlap) {
                res.status(400).json({ message: 'Another booking was already confirmed for these dates.' });
                return;
            }
            const [updatedBooking] = yield prisma_1.prisma.$transaction([
                prisma_1.prisma.booking.update({
                    where: { id },
                    data: {
                        status: client_1.BookingStatus.confirmed,
                        depositStatus: client_1.DepositStatus.held
                    }
                }),
                prisma_1.prisma.message.create({
                    data: {
                        bookingId: id,
                        senderId: req.userId,
                        content: `Hi ${booking.renter.name}! I've accepted your booking request for ${booking.listing.title}. Let's coordinate pickup.`
                    }
                })
            ]);
            res.status(200).json({ message: 'Booking accepted.', booking: updatedBooking });
            return;
        }
        if (action === 'complete') {
            const allowedStatuses = [client_1.BookingStatus.confirmed, client_1.BookingStatus.ongoing];
            if (!allowedStatuses.includes(booking.status)) {
                res.status(400).json({ message: 'Only confirmed or ongoing bookings can be marked as complete.' });
                return;
            }
            const updated = yield prisma_1.prisma.booking.update({
                where: { id },
                data: {
                    status: client_1.BookingStatus.completed,
                    depositStatus: client_1.DepositStatus.released // conceptually returned deposit upon completion
                }
            });
            res.status(200).json({ message: 'Booking marked as completed.', booking: updated });
            return;
        }
    }
    catch (err) {
        next(err);
    }
}));
exports.default = router;
