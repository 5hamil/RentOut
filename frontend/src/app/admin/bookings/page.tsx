'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function AdminBookingsPage() {
  const { accessToken } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/bookings?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch bookings');
      const data = await res.json();
      setBookings(data.bookings);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, page]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">Platform Bookings</h1>
        <p className="text-sm text-muted">Total: {total}</p>
      </div>
      
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="bg-muted/10 text-xs uppercase text-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Listing</th>
                <th className="px-6 py-4 font-medium">Parties</th>
                <th className="px-6 py-4 font-medium">Dates</th>
                <th className="px-6 py-4 font-medium">Value</th>
                <th className="px-6 py-4 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">Loading...</td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">No bookings found.</td>
                </tr>
              ) : (
                bookings.map(b => (
                  <tr key={b.id} className="hover:bg-muted/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground max-w-[200px] truncate">
                      <a href={`/listings/${b.listingId}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
                        {b.listing.title}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <span className="font-semibold text-foreground">O:</span> {b.owner.name} <br/>
                        <span className="font-semibold text-foreground">R:</span> {b.renter.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {format(new Date(b.startDate), 'MMM d, yyyy')} - <br/>
                      {format(new Date(b.endDate), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-foreground">₹{b.totalPrice}</span> <br/>
                      <span className="text-xs text-muted">Dep: ₹{b.depositAmount}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize ${
                        b.status === 'confirmed' ? 'bg-success/20 text-success' :
                        b.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                        b.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        b.status === 'cancelled' ? 'bg-error/10 text-error' :
                        'bg-warning/20 text-warning-foreground' // requested
                      }`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-border bg-card px-6 py-4 flex items-center justify-between">
            <span className="text-sm text-muted">Page <span className="font-medium text-foreground">{page}</span> of <span className="font-medium text-foreground">{totalPages}</span></span>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button 
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
