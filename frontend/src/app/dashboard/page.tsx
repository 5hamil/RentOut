'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import BookingCard from './_components/BookingCard';
import { BookingCardSkeleton } from './_components/BookingCardSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

type Tab = 'trips' | 'requests' | 'messages' | 'settings' | 'gear';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, accessToken, isLoading: authLoading } = useAuth();
  
  const initialTab = (searchParams.get('tab') as Tab) || 'trips';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  
  const [bookings, setBookings] = useState<any[]>([]);
  const [myGear, setMyGear] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Protect route
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/dashboard');
    }
  }, [authLoading, user, router]);

  const fetchData = useCallback(async () => {
    if (!accessToken || activeTab === 'settings') return;
    setIsLoading(true);
    setError('');

    try {
      if (activeTab === 'gear') {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/listings/me`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!res.ok) throw new Error('Failed to fetch gear');
        const data = await res.json();
        setMyGear(data.listings);
      } else if (activeTab === 'messages') {
        // Fetch both renter and owner bookings to populate global inbox
        const [renterRes, ownerRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bookings/renter`, { headers: { Authorization: `Bearer ${accessToken}` } }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bookings/owner`, { headers: { Authorization: `Bearer ${accessToken}` } })
        ]);

        if (!renterRes.ok || !ownerRes.ok) throw new Error('Failed to fetch messages');
        
        const renterData = await renterRes.json();
        const ownerData = await ownerRes.json();
        
        // Combine them
        const combined = [...renterData.bookings, ...ownerData.bookings];
        // Sort by newest first (descending)
        combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setBookings(combined);

      } else {
        const endpoint = activeTab === 'trips' ? '/api/bookings/renter' : '/api/bookings/owner';
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });

        if (!res.ok) throw new Error('Failed to fetch bookings');
        
        const data = await res.json();
        setBookings(data.bookings);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, accessToken]);

  useEffect(() => {
    if (user && !authLoading && activeTab !== 'settings') {
      fetchData();
    }
  }, [fetchData, user, authLoading, activeTab]);

  // Handle URL updates when tab changes
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    router.replace(`/dashboard?tab=${tab}`, { scroll: false });
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-primary" />
      </div>
    );
  }

  const tabs = [
    { id: 'gear', label: 'My Gear', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /> },
    { id: 'trips', label: 'My Trips', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
    { id: 'requests', label: 'Requests Received', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /> },
    { id: 'messages', label: 'Messages', disabled: false, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /> },
    { id: 'settings', label: 'Account Settings', disabled: true, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /> },
  ];

  const fadeVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
  };

  return (
    <div className="min-h-[calc(100vh-69px)] bg-[#F7F8FA] pb-24 pt-8 sm:pt-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header section */}
        <div className="mb-8 hidden sm:block">
          <h1 className="text-3xl font-heading font-extrabold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted mt-1">Manage your rentals, trips, and account.</p>
        </div>
        
        {searchParams.get('success') === 'true' && (
          <div className="mb-8 rounded-2xl bg-success/10 p-4 text-sm font-medium text-success border border-success/20 flex items-center gap-3">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Booking requested successfully! The owner has been notified.
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          
          {/* ─── Navigation / Sidebar ────────────────────────────────────────── */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 no-scrollbar" aria-label="Tabs">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => !tab.disabled && handleTabChange(tab.id as Tab)}
                    disabled={tab.disabled}
                    className={`
                      flex items-center gap-3 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-semibold transition-all
                      ${isActive 
                        ? 'bg-black text-white shadow-md shadow-black/10' 
                        : 'text-muted hover:bg-gray-100/80 hover:text-foreground'
                      }
                      ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <svg className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {tab.icon}
                    </svg>
                    {tab.label}
                    {tab.disabled && <span className="ml-auto text-[10px] uppercase tracking-wider text-muted bg-gray-200/50 px-2 py-0.5 rounded-full">Soon</span>}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* ─── Main Content Area ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={fadeVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full"
              >
                {activeTab === 'gear' ? (
                  <>
                    {isLoading ? (
                      <div className="flex flex-col gap-6">
                        <BookingCardSkeleton />
                        <BookingCardSkeleton />
                      </div>
                    ) : error ? (
                      <div className="rounded-2xl bg-error/10 p-6 text-center text-error border border-error/20 font-medium">{error}</div>
                    ) : myGear.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white/50 py-24 text-center">
                        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-100">
                          <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {tabs[0].icon}
                          </svg>
                        </div>
                        <h3 className="text-xl font-heading font-bold text-foreground">No gear listed yet</h3>
                        <p className="mt-3 max-w-sm text-sm text-muted font-light leading-relaxed">
                          Turn your idle equipment into extra income. Start listing your gear today.
                        </p>
                        <a href="/listings/create" className="mt-8 rounded-full bg-black px-8 py-3 text-sm font-bold text-white shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] transition-transform hover:scale-105">
                          List Your Gear
                        </a>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myGear.map((listing) => (
                          <div key={listing.id} className="group relative flex flex-col overflow-hidden rounded-[1.5rem] bg-white border border-gray-100 shadow-sm transition-all hover:shadow-md">
                            <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                              <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                              <div className="absolute top-4 right-4 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-bold text-black shadow-sm">
                                ${listing.pricePerDay}/day
                              </div>
                            </div>
                            <div className="flex flex-1 flex-col p-5">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="rounded-md bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                                  {listing.category}
                                </span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${listing.status === 'active' ? 'text-success' : 'text-warning'}`}>
                                  • {listing.status}
                                </span>
                              </div>
                              <h3 className="font-heading text-lg font-bold text-black line-clamp-1 mb-4">{listing.title}</h3>
                              <div className="mt-auto pt-4 border-t border-gray-100">
                                <a 
                                  href={`/listings/${listing.id}/edit`}
                                  className="block w-full rounded-xl bg-gray-50 py-2.5 text-center text-sm font-bold text-black transition-colors hover:bg-gray-100"
                                >
                                  Edit Listing
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : activeTab === 'trips' || activeTab === 'requests' ? (
                  <>
                    {isLoading ? (
                      <div className="flex flex-col gap-6">
                        <BookingCardSkeleton />
                        <BookingCardSkeleton />
                        <BookingCardSkeleton />
                      </div>
                    ) : error ? (
                      <div className="rounded-2xl bg-error/10 p-6 text-center text-error border border-error/20 font-medium">{error}</div>
                    ) : bookings.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white/50 py-24 text-center">
                        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-100">
                          <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {activeTab === 'trips' ? tabs[1].icon : tabs[2].icon}
                          </svg>
                        </div>
                        <h3 className="text-xl font-heading font-bold text-foreground">
                          {activeTab === 'trips' ? "No trips planned" : "No requests yet"}
                        </h3>
                        <p className="mt-3 max-w-sm text-sm text-muted font-light leading-relaxed">
                          {activeTab === 'trips' 
                            ? "It's time to dust off your creative vision. Find the perfect gear and start your next project."
                            : "When someone requests to rent your gear, you'll see those requests here so you can review them."}
                        </p>
                        {activeTab === 'trips' && (
                          <a href="/listings" className="mt-8 rounded-full bg-black px-8 py-3 text-sm font-bold text-white shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] transition-transform hover:scale-105">
                            Explore Gear
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-6">
                        {bookings.map((booking) => (
                          <BookingCard
                            key={booking.id}
                            booking={booking}
                            mode={activeTab === 'trips' ? 'renter' : 'owner'}
                            onStatusChange={fetchData}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : activeTab === 'messages' ? (
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    {isLoading ? (
                      <div className="divide-y divide-gray-100">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="p-4 sm:p-6 flex items-center gap-4">
                            <Skeleton className="h-14 w-14 rounded-full" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-1/3" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : bookings.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="mb-6 rounded-full bg-gray-50 p-6 ring-1 ring-gray-100">
                          <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-heading font-bold text-foreground">Your inbox is empty</h3>
                        <p className="mt-2 max-w-sm text-sm text-muted font-medium leading-relaxed">
                          Once you request gear or someone requests yours, your active chats will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 flex flex-col">
                        {bookings.map((booking) => {
                          const isRenter = booking.renterId === user.id;
                          const counterparty = isRenter ? booking.owner : booking.renter;
                          const roleLabel = isRenter ? 'Owner' : 'Renter';
                          
                          return (
                            <Link 
                              key={booking.id} 
                              href={`/dashboard/chat/${booking.id}`}
                              className="flex items-center gap-4 p-4 sm:p-6 transition-colors hover:bg-gray-50/80 group"
                            >
                              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gray-100 ring-2 ring-transparent transition-all group-hover:ring-gray-200">
                                {counterparty?.profileImage ? (
                                  <img src={counterparty.profileImage} alt={counterparty.name} className="h-full w-full object-cover" />
                                ) : (
                                  <svg className="h-full w-full text-gray-400 p-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 flex justify-between items-center">
                                <div>
                                  <h4 className="text-base font-bold text-foreground truncate">{counterparty?.name || 'Unknown User'}</h4>
                                  <p className="text-sm font-medium text-muted truncate mt-0.5">
                                    <span className="text-xs uppercase tracking-wider font-bold text-gray-400 mr-2">{roleLabel}</span>
                                    {booking.listing.title}
                                  </p>
                                </div>
                                <div className="ml-4 flex-shrink-0">
                                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    booking.status === 'requested' ? 'bg-warning/20 text-warning-foreground' : 
                                    booking.status === 'confirmed' || booking.status === 'ongoing' ? 'bg-success/20 text-success' : 
                                    'bg-gray-100 text-gray-500'
                                  }`}>
                                    {booking.status}
                                  </div>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white/50 py-32 text-center">
                    <svg className="h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {tabs.find(t => t.id === activeTab)?.icon}
                    </svg>
                    <h3 className="text-xl font-heading font-bold text-foreground mb-2">Coming Soon</h3>
                    <p className="text-muted text-sm max-w-xs font-light">This feature is currently under development. Check back later!</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-primary" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
