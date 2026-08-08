'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Menu, User, LogOut, Search, UserCircle, LayoutDashboard, CalendarDays, Shield, Plus } from 'lucide-react';

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password'];
  if (authRoutes.includes(pathname)) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 lg:px-8">
        
        {/* Left: Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="text-2xl font-heading font-black tracking-tighter text-black transition-opacity hover:opacity-80">
            RentOut.
          </Link>
        </div>

        {/* Right: Actions & Auth */}
        <div className="flex items-center gap-6">
          <Link href="/listings" className="hidden sm:flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-black transition-colors">
            <Search strokeWidth={1.5} className="h-4 w-4" />
            Explore
          </Link>
          
          {isAuthenticated ? (
            <div className="relative ml-2" ref={dropdownRef}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2.5 rounded-full border border-gray-200 bg-white p-1.5 pl-3 transition-all hover:border-gray-300 hover:bg-gray-50 focus:outline-none"
              >
                <Menu strokeWidth={1.5} className="h-4 w-4 text-gray-600" />
                <div className="h-8 w-8 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center border border-gray-200">
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    <User strokeWidth={1.5} className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-3 w-64 origin-top-right rounded-2xl bg-white shadow-xl shadow-black/5 ring-1 ring-gray-100 focus:outline-none border border-gray-100 overflow-hidden py-2 transition-all animate-in fade-in slide-in-from-top-2">
                  <div className="px-5 py-3 border-b border-gray-50 mb-2">
                    <p className="text-sm font-bold text-black truncate tracking-tight">{user?.name}</p>
                    <p className="text-xs font-medium text-gray-500 truncate mt-1">{user?.email}</p>
                  </div>
                  <div className="py-1 px-2">
                    <Link href="/listings/create" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-black hover:bg-gray-100 rounded-xl transition-colors">
                      <Plus strokeWidth={1.5} className="h-4 w-4" />
                      List Your Gear
                    </Link>
                    <Link href="/dashboard" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors mt-1">
                      <LayoutDashboard strokeWidth={1.5} className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <Link href="/dashboard?tab=trips" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors mt-1">
                      <CalendarDays strokeWidth={1.5} className="h-4 w-4" />
                      My Trips
                    </Link>
                    {user?.role === 'ADMIN' && (
                      <Link href="/admin" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors mt-1">
                        <Shield strokeWidth={1.5} className="h-4 w-4" />
                        Admin Panel
                      </Link>
                    )}
                  </div>
                  <div className="border-t border-gray-50 py-2 px-2 mt-2">
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2 text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <LogOut strokeWidth={1.5} className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link 
                href="/login"
                className="inline-flex h-9 items-center justify-center rounded-xl px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-black focus:outline-none"
              >
                Log in
              </Link>
              <Link 
                href="/signup"
                className="inline-flex h-9 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
