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
// ─── Validation ───────────────────────────────────────────────────────────────
const createListingSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(10, 'Title must be 10–80 characters.').max(80, 'Title must be 10–80 characters.'),
        description: zod_1.z.string().min(30, 'Description must be 30–1000 characters.').max(1000, 'Description must be 30–1000 characters.'),
        category: zod_1.z.enum(['camera', 'drone', 'projector', 'console', 'laptop', 'audio', 'other'], { message: 'Invalid category.' }),
        pricePerDay: zod_1.z.number().positive('Price per day must be a positive number.'),
        depositAmount: zod_1.z.number().min(0, 'Deposit must be a non-negative number.'),
        weeklyDiscount: zod_1.z.number().min(0).max(70).optional(),
        location: zod_1.z.string().min(1, 'Location is required.'),
        latitude: zod_1.z.number().min(-90).max(90),
        longitude: zod_1.z.number().min(-180).max(180),
        images: zod_1.z.array(zod_1.z.string().url('Each image must be a valid URL.')).min(1, 'Please provide 1–6 images.').max(6, 'Please provide 1–6 images.'),
        availabilityStart: zod_1.z.string().datetime({ message: 'Availability start must be a valid date.' }),
        availabilityEnd: zod_1.z.string().datetime({ message: 'Availability end must be a valid date.' }),
        blockedDates: zod_1.z.array(zod_1.z.string().datetime()).optional(),
    }).refine(data => new Date(data.availabilityEnd) > new Date(data.availabilityStart), {
        message: 'Availability end must be after start date.',
        path: ['availabilityEnd']
    })
});
// ─── POST /api/listings — create a new listing ───────────────────────────────
router.post('/', auth_1.protect, auth_1.requireVerified, (0, validate_1.validate)(createListingSchema), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, description, category, pricePerDay, depositAmount, weeklyDiscount, location, latitude, longitude, images, availabilityStart, availabilityEnd, blockedDates = [], } = req.body;
    try {
        const listing = yield prisma_1.prisma.listing.create({
            data: {
                ownerId: req.userId,
                title,
                description,
                category: category,
                pricePerDay,
                depositAmount,
                location,
                latitude,
                longitude,
                images,
                availabilityStart: new Date(availabilityStart),
                availabilityEnd: new Date(availabilityEnd),
                blockedDates: blockedDates.map((d) => new Date(d)),
                status: client_1.ListingStatus.active,
            },
            select: {
                id: true,
                title: true,
                category: true,
                status: true,
                pricePerDay: true,
                createdAt: true,
            },
        });
        res.status(201).json({
            message: 'Listing created successfully.',
            listing,
        });
    }
    catch (err) {
        next(err);
    }
}));
// ─── GET /api/listings/search — search and filter with geospatial support ─────
router.get('/search', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { q, category, minPrice, maxPrice, lat, lng, radius = '50', startDate, endDate, limit = '20', offset = '0' } = req.query;
        let geoIds = null;
        let distanceMap = {};
        // 1. Geospatial filtering (if lat/lng provided)
        if (lat && lng) {
            const latFloat = parseFloat(lat);
            const lngFloat = parseFloat(lng);
            const radiusFloat = parseFloat(radius);
            if (!isNaN(latFloat) && !isNaN(lngFloat) && !isNaN(radiusFloat)) {
                // Raw SQL for Haversine distance
                const geoResults = yield prisma_1.prisma.$queryRaw `
          SELECT id, distance
          FROM (
            SELECT id, (
              6371 * acos(
                cos(radians(${latFloat})) * cos(radians(latitude)) *
                cos(radians(longitude) - radians(${lngFloat})) +
                sin(radians(${latFloat})) * sin(radians(latitude))
              )
            ) AS distance
            FROM listings
            WHERE status = 'active'
          ) AS dist
          WHERE distance <= ${radiusFloat}
        `;
                geoIds = geoResults.map(r => r.id);
                geoResults.forEach(r => { distanceMap[r.id] = r.distance; });
            }
        }
        // 2. Build Prisma where clause
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where = { status: client_1.ListingStatus.active };
        // Apply geo filter
        if (geoIds !== null) {
            where.id = { in: geoIds };
        }
        // Keyword search
        if (q) {
            where.OR = [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } }
            ];
        }
        // Category
        if (category) {
            where.category = category;
        }
        // Price range
        if (minPrice || maxPrice) {
            where.pricePerDay = {};
            if (minPrice)
                where.pricePerDay.gte = parseFloat(minPrice);
            if (maxPrice)
                where.pricePerDay.lte = parseFloat(maxPrice);
        }
        // Availability dates
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            where.availabilityStart = { lte: start };
            where.availabilityEnd = { gte: end };
            // Ensure no blocked dates fall within the requested period
            // Prisma has some limitations with array of dates. The simplest way is to fetch 
            // all matches and filter in memory, OR since we don't have a direct "array not overlaps" in standard Prisma, 
            // we'll filter it in JavaScript for now to avoid overly complex queries.
        }
        // 3. Fetch data
        let listings = yield prisma_1.prisma.listing.findMany({
            where,
            include: {
                owner: {
                    select: { id: true, name: true, profileImage: true, avgRating: true, verificationStatus: true }
                }
            }
        });
        // 4. In-memory filter for blockedDates (Prisma doesn't easily support "none of these dates fall between start and end")
        if (startDate && endDate) {
            const start = new Date(startDate).getTime();
            const end = new Date(endDate).getTime();
            listings = listings.filter(listing => {
                // Check if any blocked date falls in the range
                const hasConflict = listing.blockedDates.some(blocked => {
                    const bTime = blocked.getTime();
                    return bTime >= start && bTime <= end;
                });
                return !hasConflict;
            });
        }
        // 5. Attach distances and sort
        const results = listings.map(listing => {
            var _a;
            return (Object.assign(Object.assign({}, listing), { distance: (_a = distanceMap[listing.id]) !== null && _a !== void 0 ? _a : null }));
        });
        if (geoIds !== null) {
            results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        }
        else {
            results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        // 6. Manual pagination (since we potentially sorted/filtered in memory)
        const offsetInt = parseInt(offset, 10);
        const limitInt = parseInt(limit, 10);
        const paginated = results.slice(offsetInt, offsetInt + limitInt);
        res.status(200).json({
            listings: paginated,
            total: results.length,
            limit: limitInt,
            offset: offsetInt
        });
    }
    catch (err) {
        next(err);
    }
}));
// ─── GET /api/listings — browse active listings ───────────────────────────────
router.get('/', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { category, limit = '20', offset = '0' } = req.query;
    try {
        const where = Object.assign({ status: client_1.ListingStatus.active }, (category ? { category: category } : {}));
        const [listings, total] = yield Promise.all([
            prisma_1.prisma.listing.findMany({
                where,
                take: Math.min(parseInt(limit, 10), 50),
                skip: parseInt(offset, 10),
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true, title: true, category: true, pricePerDay: true,
                    depositAmount: true, location: true, images: true,
                    availabilityStart: true, availabilityEnd: true,
                    owner: { select: { id: true, name: true, profileImage: true, avgRating: true, verificationStatus: true } },
                },
            }),
            prisma_1.prisma.listing.count({ where }),
        ]);
        res.status(200).json({ listings, total, limit: parseInt(limit, 10), offset: parseInt(offset, 10) });
    }
    catch (err) {
        next(err);
    }
}));
// ─── GET /api/listings/:id — get single listing details ──────────────────────
router.get('/:id', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const listing = yield prisma_1.prisma.listing.findUnique({
            where: { id },
            include: {
                owner: {
                    select: { id: true, name: true, profileImage: true, avgRating: true, verificationStatus: true, createdAt: true }
                },
                // Fetch existing bookings to disable dates on frontend
                bookings: {
                    where: {
                        status: { in: ['confirmed', 'ongoing'] }
                    },
                    select: {
                        startDate: true,
                        endDate: true
                    }
                }
            }
        });
        if (!listing) {
            res.status(404).json({ message: 'Listing not found.' });
            return;
        }
        res.status(200).json({ listing });
    }
    catch (err) {
        next(err);
    }
}));
exports.default = router;
