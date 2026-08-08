import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Fetching bookings...");
  const bookings = await prisma.booking.findMany({
    include: {
      renter: true,
      owner: true,
      listing: true
    }
  });

  if (bookings.length === 0) {
    console.log("No bookings found. Let's create a test user, listing, and booking first.");
    
    const owner = await prisma.user.upsert({
      where: { email: 'sarah.seed@example.com' },
      update: {},
      create: {
        name: 'Sarah Lens',
        email: 'sarah.seed@example.com',
        passwordHash: 'password123',
        phone: '1234567890'
      }
    });

    const renter = await prisma.user.upsert({
      where: { email: 'alex.seed@example.com' },
      update: {},
      create: {
        name: 'Alex Shoots',
        email: 'alex.seed@example.com',
        passwordHash: 'password123',
        phone: '0987654321'
      }
    });

    // Create listing
    const listing = await prisma.listing.create({
      data: {
        ownerId: owner.id,
        title: 'Sony A7S III',
        description: 'Great for video',
        pricePerDay: 85,
        depositAmount: 150,
        location: 'New York, NY',
        latitude: 40.7128,
        longitude: -74.0060,
        category: 'camera',
        images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1600&auto=format&fit=crop'],
        status: 'active',
        availabilityStart: new Date(),
        availabilityEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
      }
    });

    // Create booking
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 2);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 3);

    const booking = await prisma.booking.create({
      data: {
        listingId: listing.id,
        renterId: renter.id,
        ownerId: owner.id,
        startDate,
        endDate,
        totalPrice: 255,
        depositAmount: 150,
        status: 'confirmed'
      }
    });
    
    console.log("Created test booking:", booking.id);
    bookings.push({ ...booking, owner, renter, listing } as any);
  }

  // Create messages for the first booking we find
  const b = bookings[0];
  console.log(`Creating messages for booking ${b.id} between ${b.renter.name} and ${b.owner.name}`);

  // Delete existing messages for this booking to avoid duplicates if run multiple times
  await prisma.message.deleteMany({
    where: { bookingId: b.id }
  });

  const messages = [
    {
      senderId: b.renter.id,
      content: `Hi ${b.owner.name.split(' ')[0]}! I'm really excited to rent your ${b.listing.title}. Does it come with an extra battery?`,
      timeOffset: 60 * 60 * 1000 // 1 hour ago
    },
    {
      senderId: b.owner.id,
      content: `Hey ${b.renter.name.split(' ')[0]}! Yes, I always include two fully charged batteries in the case.`,
      timeOffset: 55 * 60 * 1000 // 55 mins ago
    },
    {
      senderId: b.renter.id,
      content: "Awesome, that's perfect for my shoot this weekend. Where is the best place to meet up for the handoff?",
      timeOffset: 30 * 60 * 1000 // 30 mins ago
    },
    {
      senderId: b.owner.id,
      content: "I usually meet people at the coffee shop on 5th and Main. How does 10 AM on Saturday sound?",
      timeOffset: 5 * 60 * 1000 // 5 mins ago
    }
  ];

  for (const m of messages) {
    await prisma.message.create({
      data: {
        bookingId: b.id,
        senderId: m.senderId,
        content: m.content,
        createdAt: new Date(Date.now() - m.timeOffset)
      }
    });
  }

  console.log("Successfully seeded 4 messages!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
