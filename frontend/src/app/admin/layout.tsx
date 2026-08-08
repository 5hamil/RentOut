'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!user) router.push('/login');
      else if (!user.isAdmin) router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user?.isAdmin) return null;

  const navItems = [
    { name: 'Overview', href: '/admin' },
    { name: 'Users', href: '/admin/users' },
    { name: 'Listings', href: '/admin/listings' },
    { name: 'Bookings', href: '/admin/bookings' },
    { name: 'Verifications', href: '/admin/verifications' },
    { name: 'Reports', href: '/admin/reports' },
    { name: 'Disputes', href: '/admin/disputes' },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-background">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-border bg-card shadow-sm">
        <div className="p-6">
          <h2 className="text-xl font-heading font-bold text-foreground tracking-tight">Admin Console</h2>
          <p className="text-xs text-muted mt-1">Platform Management</p>
        </div>
        <nav className="mt-2 space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground hover:bg-muted/10'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
