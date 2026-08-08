import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Star, ShieldCheck } from 'lucide-react';

export interface ListingCardProps {
  id: string;
  title: string;
  category: string;
  pricePerDay: number;
  images: string[];
  distance?: number | null;
  owner: {
    name: string;
    avgRating: number | null;
    profileImage: string | null;
    verificationStatus: string;
  };
}

export default function ListingCard({
  id, title, category, pricePerDay, images, distance, owner
}: ListingCardProps) {
  const coverImage = images[0] || '/placeholder.png';
  const rating = owner.avgRating ? owner.avgRating.toFixed(1) : 'New';

  return (
    <motion.div className="group">
      <Link href={`/listings/${id}`} className="flex flex-col gap-4">
        {/* Image container */}
        <div className="relative aspect-square w-full overflow-hidden rounded-[1.5rem] bg-gray-100 ring-1 ring-gray-200 transition-all">
          <Image
            src={coverImage}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          {/* Verification badge */}
          {owner.verificationStatus === 'verified' && (
            <div className="absolute left-4 top-4">
              <div className="flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-black shadow-sm ring-1 ring-black/5 backdrop-blur-md">
                <ShieldCheck strokeWidth={2.5} className="h-3.5 w-3.5" />
                Verified
              </div>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-1.5 px-1">
          <div className="flex items-start justify-between gap-4">
            <h3 className="font-heading font-bold text-black line-clamp-1 text-base tracking-tight">{title}</h3>
            <div className="flex shrink-0 items-center gap-1 text-sm font-bold text-black">
              <Star strokeWidth={2.5} className="h-3.5 w-3.5" />
              {rating}
            </div>
          </div>
          
          <p className="text-sm text-gray-500 capitalize line-clamp-1 font-medium">{category}{distance !== undefined && distance !== null ? ` • ${distance.toFixed(1)} km away` : ''}</p>
          
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-heading font-black text-lg text-black tracking-tight">₹{pricePerDay}</span>
            <span className="text-sm font-medium text-gray-500">/ day</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
