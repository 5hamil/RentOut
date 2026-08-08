'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function AdminListingsPage() {
  const { accessToken } = useAuth();
  const [listings, setListings] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/listings?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch listings');
      const data = await res.json();
      setListings(data.listings);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, page]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const toggleStatus = async (listingId: string, currentStatus: string) => {
    if (!accessToken) return;
    setActioningId(listingId);
    
    const newStatus = currentStatus === 'removed' ? 'active' : 'removed';
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/listings/${listingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update listing status');
      
      // Update local state
      setListings(prev => prev.map(l => l.id === listingId ? { ...l, status: newStatus } : l));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">Listings Moderation</h1>
        <p className="text-sm text-muted">Total: {total}</p>
      </div>
      
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="bg-muted/10 text-xs uppercase text-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Title</th>
                <th className="px-6 py-4 font-medium">Owner</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Created</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">Loading...</td>
                </tr>
              ) : listings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">No listings found.</td>
                </tr>
              ) : (
                listings.map(l => (
                  <tr key={l.id} className="hover:bg-muted/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground max-w-xs truncate">
                      <a href={`/listings/${l.id}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
                        {l.title}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      {l.owner.name} <br/>
                      <span className="text-xs text-muted">{l.owner.email}</span>
                    </td>
                    <td className="px-6 py-4">
                      {l.status === 'active' ? (
                        <span className="text-success font-medium">Active</span>
                      ) : l.status === 'removed' ? (
                        <span className="text-error font-medium">Removed</span>
                      ) : (
                        <span className="text-warning-foreground font-medium capitalize">{l.status}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{format(new Date(l.createdAt), 'MMM d, yyyy')}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleStatus(l.id, l.status)}
                        disabled={actioningId === l.id}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          l.status === 'removed'
                            ? 'bg-muted/20 text-muted hover:bg-muted/30' 
                            : 'bg-error/10 text-error hover:bg-error/20'
                        } disabled:opacity-50`}
                      >
                        {l.status === 'removed' ? 'Restore' : 'Force Remove'}
                      </button>
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
