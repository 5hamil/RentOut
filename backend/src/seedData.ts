import { PrismaClient, ListingCategory, VerificationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const firstNames = ['Alex', 'Jordan', 'Taylor', 'Casey', 'Riley', 'Morgan', 'Sam', 'Jamie', 'Charlie', 'Drew'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const cities = ['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ', 'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA'];

const gearNames = [
  'Sony A7III', 'Canon EOS R5', 'DJI Mavic 3', 'Red Komodo 6K', 
  'Sony FX3', 'Arri Alexa Mini', 'DJI Ronin RS3', 'Sennheiser MKH416',
  'Aputure 120d II', 'Sigma 24-70mm f/2.8', 'Blackmagic Pocket 6K Pro', 'GoPro HERO 11'
];
const categories = ['camera', 'camera', 'drone', 'camera', 'camera', 'camera', 'other', 'audio', 'other', 'other', 'camera', 'camera'] as ListingCategory[];

function getRandom(arr: any[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('Cleaning up database...');
  
  // Due to foreign key constraints, we must delete child tables first or just let cascade handle it if properly set up.
  // Using cascade on User relations simplifies things, but to be safe we'll delete in order or use a quick wipe:
  await prisma.review.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.disputeClaim.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.passwordResetToken.deleteMany({});
  await prisma.listing.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Database cleaned.');

  const passwordHash = await bcrypt.hash('password123', 10);
  console.log('Generating 30 users and listings...');

  for (let i = 1; i <= 30; i++) {
    const fn = getRandom(firstNames);
    const ln = getRandom(lastNames);
    
    // Create User
    const user = await prisma.user.create({
      data: {
        name: `${fn} ${ln}`,
        email: `user${i}@example.com`,
        phone: `+15550000${i.toString().padStart(2, '0')}`,
        passwordHash,
        verificationStatus: i % 3 === 0 ? VerificationStatus.unverified : VerificationStatus.verified,
        avgRating: Math.floor(Math.random() * 2) + 4, // 4 or 5
        profileImage: `https://i.pravatar.cc/150?u=${i}`,
        tosAcceptedAt: new Date(),
        tosVersion: '1.0'
      }
    });

    // Create 1-3 Listings per user
    const numListings = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < numListings; j++) {
      const gearIndex = Math.floor(Math.random() * gearNames.length);
      const title = gearNames[gearIndex];
      const category = categories[gearIndex];
      const city = getRandom(cities);
      // Rough coordinates for US cities
      const lat = 37 + (Math.random() * 5 - 2.5);
      const lng = -95 + (Math.random() * 20 - 10);

      await prisma.listing.create({
        data: {
          ownerId: user.id,
          title: title,
          description: `Excellent condition ${title}. Great for professional shoots. Battery and basic accessories included. Local pickup in ${city}.`,
          category: category,
          pricePerDay: Math.floor(Math.random() * 80) + 20, // 20 to 99
          depositAmount: Math.floor(Math.random() * 400) + 100, // 100 to 499
          location: city,
          latitude: lat,
          longitude: lng,
          images: [
            `https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1600&auto=format&fit=crop`,
            `https://images.unsplash.com/photo-1502920917128-1aa500764cbd?q=80&w=1600&auto=format&fit=crop`
          ],
          availabilityStart: new Date(),
          availabilityEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          blockedDates: []
        }
      });
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
