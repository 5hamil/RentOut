'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function AdminUsersPage() {
  const { accessToken } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users?page=${page}&limit=10&search=${search}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page on search
    fetchUsers();
  };

  const toggleSuspend = async (userId: string, currentStatus: boolean) => {
    if (!accessToken) return;
    setActioningId(userId);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${userId}/suspend`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ isSuspended: !currentStatus })
      });
      if (!res.ok) throw new Error('Failed to update suspension status');
      
      // Update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isSuspended: !currentStatus } : u));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">Users</h1>
        <p className="text-sm text-muted">Total: {total}</p>
      </div>
      
      <Card className="mb-6 p-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md">
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button type="submit">
            Search
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="bg-muted/10 text-xs uppercase text-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Verification</th>
                <th className="px-6 py-4 font-medium">Joined</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">Loading...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">No users found.</td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-muted/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground flex items-center gap-2">
                      {u.name} {u.isAdmin && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">ADMIN</span>}
                    </td>
                    <td className="px-6 py-4">{u.email}</td>
                    <td className="px-6 py-4">
                      {u.verificationStatus === 'verified' ? (
                        <span className="text-success font-medium">Verified</span>
                      ) : u.verificationStatus === 'permanently_blocked' ? (
                        <span className="text-error font-medium">Blocked</span>
                      ) : (
                        <span className="text-muted capitalize">{u.verificationStatus}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{format(new Date(u.createdAt), 'MMM d, yyyy')}</td>
                    <td className="px-6 py-4 text-right">
                      {!u.isAdmin && (
                        <button
                          onClick={() => toggleSuspend(u.id, u.isSuspended)}
                          disabled={actioningId === u.id}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            u.isSuspended 
                              ? 'bg-muted/20 text-muted hover:bg-muted/30' 
                              : 'bg-error/10 text-error hover:bg-error/20'
                          } disabled:opacity-50`}
                        >
                          {u.isSuspended ? 'Unsuspend' : 'Suspend'}
                        </button>
                      )}
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
