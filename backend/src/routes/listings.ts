import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { protect, requireVerified, AuthRequest } from '../middleware/auth';
import { ListingCategory, ListingStatus } from '@prisma/client';
import { z } from 'zod';
import { validate } from '../middleware/validate';

const router = Router();

// ─── Validation ───────────────────────────────────────────────────────────────

const createListingSchema = z.object({
  body: z.object({
    title: z.string().min(10, 'Title must be 10–80 characters.').max(80, 'Title must be 10–80 characters.'),
    description: z.string().min(30, 'Description must be 30–1000 characters.').max(1000, 'Description must be 30–1000 characters.'),
    category: z.enum(['camera', 'drone', 'projector', 'console', 'laptop', 'audio', 'other'], { message: 'Invalid category.' }),
    pricePerDay: z.number().positive('Price per day must be a positive number.'),
    depositAmount: z.number().min(0, 'Deposit must be a non-negative number.'),
    weeklyDiscount: z.number().min(0).max(70).optional(),
    location: z.string().min(1, 'Location is required.'),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    images: z.array(z.string().url('Each image must be a valid URL.')).min(1, 'Please provide 1–6 images.').max(6, 'Please provide 1–6 images.'),
    availabilityStart: z.string().datetime({ message: 'Availability start must be a valid date.' }),
    availabilityEnd: z.string().datetime({ message: 'Availability end must be a valid date.' }),
    blockedDates: z.array(z.string().datetime()).optional(),
  }).refine(data => new Date(data.availabilityEnd) > new Date(data.availabilityStart), {
    message: 'Availability end must be after start date.',
    path: ['availabilityEnd']
  })
});

// ─── GET /api/listings/me — get user's own listings ─────────────────────────

router.get('/me', protect, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const listings = await prisma.listing.findMany({
      where: { ownerId: req.userId! },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        pricePerDay: true,
        createdAt: true,
        images: true,
      }
    });

    res.status(200).json({ listings });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/listings — create a new listing ───────────────────────────────

router.post('/', protect, validate(createListingSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {

  const {
    title, description, category, pricePerDay, depositAmount, weeklyDiscount,
    location, latitude, longitude, images,
    availabilityStart, availabilityEnd, blockedDates = [],
  } = req.body;

  try {
    const listing = await prisma.listing.create({
      data: {
        ownerId: req.userId!,
        title,
        description,
        category: category as ListingCategory,
        pricePerDay,
        depositAmount,
        location,
        latitude,
        longitude,
        images,
        availabilityStart: new Date(availabilityStart),
        availabilityEnd: new Date(availabilityEnd),
        blockedDates: blockedDates.map((d: string) => new Date(d)),
        status: ListingStatus.active,
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
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/listings/:id — update a listing ──────────────────────────────────

router.put('/:id', protect, validate(createListingSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const {
    title, description, category, pricePerDay, depositAmount, weeklyDiscount,
    location, latitude, longitude, images,
    availabilityStart, availabilityEnd, blockedDates = [],
  } = req.body;

  try {
    const existingListing = await prisma.listing.findUnique({
      where: { id },
      select: { ownerId: true }
    });

    if (!existingListing) {
      res.status(404).json({ message: 'Listing not found.' });
      return;
    }

    if (existingListing.ownerId !== req.userId) {
      res.status(403).json({ message: 'You do not have permission to edit this listing.' });
      return;
    }

    const updatedListing = await prisma.listing.update({
      where: { id },
      data: {
        title,
        description,
        category: category as ListingCategory,
        pricePerDay,
        depositAmount,
        location,
        latitude,
        longitude,
        images,
        availabilityStart: new Date(availabilityStart),
        availabilityEnd: new Date(availabilityEnd),
        blockedDates: blockedDates.map((d: string) => new Date(d)),
      },
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        pricePerDay: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      message: 'Listing updated successfully.',
      listing: updatedListing,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/listings/search — search and filter with geospatial support ─────

router.get('/search', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      q, category, minPrice, maxPrice,
      lat, lng, radius = '50',
      startDate, endDate,
      limit = '20', offset = '0'
    } = req.query as Record<string, string>;

    let geoIds: string[] | null = null;
    let distanceMap: Record<string, number> = {};

    // 1. Geospatial filtering (if lat/lng provided)
    if (lat && lng) {
      const latFloat = parseFloat(lat);
      const lngFloat = parseFloat(lng);
      const radiusFloat = parseFloat(radius);

      if (!isNaN(latFloat) && !isNaN(lngFloat) && !isNaN(radiusFloat)) {
        // Raw SQL for Haversine distance
        const geoResults = await prisma.$queryRaw<Array<{ id: string; distance: number }>>`
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
    const where: any = { status: ListingStatus.active };

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
      where.category = category as ListingCategory;
    }

    // Price range
    if (minPrice || maxPrice) {
      where.pricePerDay = {};
      if (minPrice) where.pricePerDay.gte = parseFloat(minPrice);
      if (maxPrice) where.pricePerDay.lte = parseFloat(maxPrice);
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
    let listings = await prisma.listing.findMany({
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
    const results = listings.map(listing => ({
      ...listing,
      distance: distanceMap[listing.id] ?? null
    }));

    if (geoIds !== null) {
      results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else {
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
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/listings — browse active listings ───────────────────────────────

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { category, limit = '20', offset = '0' } = req.query as Record<string, string>;

  try {
    const where = {
      status: ListingStatus.active,
      ...(category ? { category: category as ListingCategory } : {}),
    };

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
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
      prisma.listing.count({ where }),
    ]);

    res.status(200).json({ listings, total, limit: parseInt(limit, 10), offset: parseInt(offset, 10) });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/listings/:id — get single listing details ──────────────────────

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;

  try {
    const listing = await prisma.listing.findUnique({
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
  } catch (err) {
    next(err);
  }
});

export default router;
