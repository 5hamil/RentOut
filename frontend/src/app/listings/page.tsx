'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import FiltersBar, { FilterState } from './_components/FiltersBar';
import ListingCard from './_components/ListingCard';
import { ListingCardSkeleton } from './_components/ListingCardSkeleton';
import { SearchX } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

// Dynamically import map to avoid SSR 'window is not defined' errors
const ListingsMap = dynamic(() => import('./_components/ListingsMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-50/50 backdrop-blur-sm">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
    </div>
  ),
});

export default function DiscoveryPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [filters, setFilters] = useState<FilterState>({
    q: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    lat: '',
    lng: '',
    radius: '50',
    locationName: '',
    startDate: '',
    endDate: '',
  });

  const [listings, setListings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const fetchListings = useCallback(async (currentPage: number) => {
    if (currentPage === 1) setIsLoading(true);
    else setIsLoadingMore(true);
    
    setError('');

    try {
      const limit = 20;
      const offset = (currentPage - 1) * limit;
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      if (filters.q) params.append('q', filters.q);
      if (filters.category) params.append('category', filters.category);
      if (filters.minPrice) params.append('minPrice', filters.minPrice);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
      if (filters.lat && filters.lng) {
        params.append('lat', filters.lat);
        params.append('lng', filters.lng);
        params.append('radius', filters.radius);
      }
      if (filters.startDate && filters.endDate) {
        params.append('startDate', filters.startDate);
        params.append('endDate', filters.endDate);
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/listings/search?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch listings');
      
      const data = await res.json();
      const newItems = data.listings || [];
      
      if (currentPage === 1) {
        setListings(newItems);
      } else {
        setListings(prev => {
          // Prevent duplicates on double-fetch
          const existingIds = new Set(prev.map(l => l.id));
          const uniqueNewItems = newItems.filter((l: any) => !existingIds.has(l.id));
          return [...prev, ...uniqueNewItems];
        });
      }
      
      setHasMore(newItems.length === limit);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [filters]);

  useEffect(() => {
    setPage(1);
    fetchListings(1);
  }, [fetchListings]);

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchListings(nextPage);
    }
  };

  const updateFilters = useCallback((updates: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  };

  return (
    <div className="flex h-[calc(100vh-69px)] flex-col bg-white overflow-hidden">
      {/* Top Filter Bar */}
      <FiltersBar 
        filters={filters} 
        onChange={updateFilters} 
        viewMode={viewMode}
        setViewMode={setViewMode}
        itemCount={listings.length}
        isLoading={isLoading}
      />

      {/* Main Content Area (Split-screen on desktop, toggle on mobile) */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left/Grid Section */}
        <div className={`flex-1 overflow-y-auto ${viewMode === 'map' ? 'hidden lg:block' : 'block'}`}>
          <div className="mx-auto w-full px-4 py-8 sm:px-6 lg:px-8 max-w-[1400px]">
            
            {error && (
              <div className="p-8 text-center text-red-500 font-medium">{error}</div>
            )}

            {isLoading ? (
              <div className={`grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 ${viewMode === 'map' ? 'xl:grid-cols-3' : 'lg:grid-cols-3 xl:grid-cols-4'} xl:gap-x-8`}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <ListingCardSkeleton key={i} />
                ))}
              </div>
            ) : listings.length === 0 && !error ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="mb-6 rounded-2xl bg-gray-50 p-6 ring-1 ring-gray-100">
                  <SearchX strokeWidth={1} className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-2xl font-heading font-bold text-black tracking-tight">No gear found</h3>
                <p className="mt-3 max-w-sm text-sm text-gray-500 font-medium">
                  Try adjusting your search, removing filters, or searching in a different location.
                </p>
                <button
                  onClick={() => updateFilters({ q: '', category: '', lat: '', lng: '', locationName: '', minPrice: '', maxPrice: '' })}
                  className="mt-8 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-gray-50 hover:border-gray-300 shadow-sm"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className={`grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 ${viewMode === 'map' ? 'xl:grid-cols-3' : 'lg:grid-cols-3 xl:grid-cols-4'} xl:gap-x-8`}
                >
                  {listings.map((listing) => (
                    <motion.div key={listing.id} variants={itemVariants}>
                      <ListingCard {...listing} />
                    </motion.div>
                  ))}
                </motion.div>
                
                {hasMore && (
                  <div className="mt-12 flex justify-center pb-12">
                    <button
                      onClick={loadMore}
                      disabled={isLoadingMore}
                      className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingMore ? 'Loading...' : 'Load more items'}
                    </button>
                  </div>
                )}
              </>
            )}
            
          </div>
        </div>

        {/* Right/Map Section */}
        <div className={`relative ${viewMode === 'map' ? 'block lg:w-[40%] xl:w-[45%] border-l border-gray-200' : 'hidden'} h-full bg-gray-50 overflow-hidden`}>
          <ListingsMap listings={listings} centerLat={filters.lat} centerLng={filters.lng} />
          
          {/* Optional: Overlay loading state on map */}
          {isLoading && (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/50 backdrop-blur-sm">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
