'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import BookingWidget from './_components/BookingWidget';

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  
  const [listing, setListing] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    async function fetchListing() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/listings/${id}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('Listing not found');
          throw new Error('Failed to load listing');
        }
        const data = await res.json();
        setListing(data.listing);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    if (id) fetchListing();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-primary" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white text-center">
        <h1 className="text-2xl font-bold text-foreground">{error || 'Listing not found'}</h1>
        <Link href="/listings" className="mt-4 text-primary hover:underline">
          ← Back to listings
        </Link>
      </div>
    );
  }

  const { images, owner } = listing;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
          >
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute right-6 top-6 rounded-full bg-white/10 p-3 text-white hover:bg-white/25 transition"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            
            <div className="relative aspect-video w-full max-w-5xl">
              <Image src={images[lightboxIndex]} alt="Gallery view" fill className="object-contain" />
            </div>

            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => i! === 0 ? images.length - 1 : i! - 1); }}
                  className="absolute left-6 top-1/2 -mt-6 rounded-full bg-white/10 p-3 text-white hover:bg-white/25 transition"
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => i! === images.length - 1 ? 0 : i! + 1); }}
                  className="absolute right-6 top-1/2 -mt-6 rounded-full bg-white/10 p-3 text-white hover:bg-white/25 transition"
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-7xl px-4 py-8 pb-32 sm:px-6 sm:pb-12 lg:px-8"
      >
        
        {/* Title & Breadcrumbs */}
        <motion.div variants={itemVariants} className="mb-6">
          <Link href="/listings" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground mb-4 transition-colors font-medium">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            Back to search
          </Link>
          <h1 className="text-3xl font-heading font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl mb-2">{listing.title}</h1>
          <div className="flex items-center gap-4 text-sm text-muted font-medium">
            <span className="capitalize">{listing.category}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4 text-muted/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {listing.location}
            </span>
          </div>
        </motion.div>

        {/* Bento Box Gallery Hero */}
        <motion.div variants={itemVariants} className="mb-12 relative overflow-hidden rounded-3xl h-[40vh] sm:h-[50vh] lg:h-[60vh]">
          <div className={`grid h-full w-full gap-2 ${images.length > 1 ? 'grid-cols-4 grid-rows-2' : 'grid-cols-1 grid-rows-1'}`}>
            {/* Main Image (Left Half) */}
            <div
              onClick={() => setLightboxIndex(0)}
              className={`relative cursor-pointer overflow-hidden bg-gray-50 group ${images.length > 1 ? 'col-span-4 sm:col-span-2 row-span-2' : 'col-span-1 row-span-1'}`}
            >
              <Image src={images[0]} alt={listing.title} fill className="object-cover transition duration-700 group-hover:scale-105 group-hover:brightness-95" />
            </div>

            {/* Smaller Images (Right Half - Desktop Only) */}
            {images.slice(1, 5).map((src: string, idx: number) => (
              <div
                key={idx}
                onClick={() => setLightboxIndex(idx + 1)}
                className="relative hidden sm:block col-span-1 row-span-1 cursor-pointer overflow-hidden bg-gray-50 group"
              >
                <Image src={src} alt="Gallery image" fill className="object-cover transition duration-700 group-hover:scale-105 group-hover:brightness-95" />
                {/* View All Photos Overlay */}
                {idx === 3 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 text-white backdrop-blur-[2px] transition-all group-hover:bg-black/40">
                    <svg className="h-8 w-8 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <span className="text-sm font-semibold tracking-wide">View all {images.length} photos</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Details & Booking Layout */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 relative">
          
          {/* Left Column: Description & Owner */}
          <motion.div variants={itemVariants} className="lg:col-span-7 xl:col-span-8 flex flex-col gap-10">
            {/* Description */}
            <div className="prose prose-gray max-w-none border-b border-gray-100 pb-10">
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">About this gear</h2>
              <p className="whitespace-pre-wrap text-muted text-base leading-relaxed font-light">{listing.description}</p>
            </div>

            {/* Owner Profile */}
            <div className="pb-10">
              <h2 className="text-2xl font-heading font-bold text-foreground mb-6">Meet your lender</h2>
              <div className="flex items-center gap-5">
                <div className="relative h-20 w-20 overflow-hidden rounded-full bg-gray-100 ring-2 ring-gray-50">
                  {owner.profileImage ? (
                    <Image src={owner.profileImage} alt={owner.name} fill className="object-cover" />
                  ) : (
                    <svg className="h-full w-full text-gray-300 p-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                    {owner.name}
                    {owner.verificationStatus === 'verified' && (
                      <div className="flex items-center justify-center rounded-full bg-primary/10 p-1">
                        <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      </div>
                    )}
                  </h3>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted font-medium">
                    <span className="flex items-center gap-1 text-foreground">
                      <svg className="h-4 w-4 text-foreground" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                      {owner.avgRating ? owner.avgRating.toFixed(1) : 'New lender'}
                    </span>
                    <span>•</span>
                    <span className="font-light">Joined {new Date(owner.createdAt).getFullYear()}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Sticky Booking Widget */}
          <motion.div variants={itemVariants} className="hidden lg:block lg:col-span-5 xl:col-span-4 relative">
            <div className="sticky top-24">
              <BookingWidget
                listingId={listing.id}
                pricePerDay={Number(listing.pricePerDay)}
                depositAmount={Number(listing.depositAmount)}
                availabilityStart={listing.availabilityStart}
                availabilityEnd={listing.availabilityEnd}
                blockedDates={listing.blockedDates}
                bookings={listing.bookings}
                onBookingSuccess={() => {
                  router.push('/dashboard?tab=trips&success=true');
                }}
              />
            </div>
          </motion.div>
          
        </div>
      </motion.div>

      {/* Mobile Sticky Booking Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-gray-100 bg-white/90 p-4 shadow-[0_-8px_20px_-1px_rgba(0,0,0,0.05)] backdrop-blur-md lg:hidden pb-safe sm:pb-6">
        <div>
          <p className="text-xl font-bold text-foreground">₹{listing.pricePerDay} <span className="text-sm font-normal text-muted">/ day</span></p>
        </div>
        <button 
          onClick={() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          }}
          className="rounded-full bg-primary px-8 py-3 font-semibold text-white shadow-sm hover:bg-primary-hover transition-colors"
        >
          Book Now
        </button>
      </div>

    </div>
  );
}
