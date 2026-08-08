'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function AdminVerificationsPage() {
  const router = useRouter();
  const { user, accessToken, isLoading: authLoading } = useAuth();
  
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Protect route
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (!user.isAdmin) {
        router.push('/dashboard');
      }
    }
  }, [authLoading, user, router]);

  const fetchVerifications = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/verifications`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch verifications');
      const data = await res.json();
      setUsers(data.users);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (user?.isAdmin && accessToken) {
      fetchVerifications();
    }
  }, [user, accessToken, fetchVerifications]);

  const handleAction = async (userId: string, action: 'approve' | 'reject') => {
    if (!accessToken) return;
    setActioningId(userId);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/verifications/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ action })
      });
      
      if (!res.ok) throw new Error(`Failed to ${action} user`);
      
      // Remove user from the list
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActioningId(null);
    }
  };

  if (authLoading || !user?.isAdmin) return null;

  return (
    <div className="min-h-screen bg-background pb-12 pt-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">Admin: ID Verification Queue</h1>
        
        {error && <div className="mt-4 rounded-xl bg-error/10 p-4 text-error">{error}</div>}

        <div className="mt-8">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-20 text-center">
              <h3 className="text-lg font-medium text-foreground">Queue Empty</h3>
              <p className="mt-1 text-muted">There are no pending identity verifications to review.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {users.map(u => (
                <Card key={u.id} className="flex flex-col overflow-hidden p-0">
                  <div className="relative h-64 w-full bg-muted/10">
                    <Image src={u.idDocumentUrl} alt="ID Document" fill className="object-contain p-2" />
                  </div>
                  <div className="p-5 flex flex-col justify-between flex-1">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{u.name}</h3>
                      <p className="text-sm text-muted">{u.email}</p>
                      <p className="text-xs text-muted mt-2">
                        Joined: {format(new Date(u.createdAt), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-warning-foreground font-medium mt-1">
                        Resubmissions: {u.resubmissionCount}
                      </p>
                    </div>
                    
                    <div className="mt-6 flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => handleAction(u.id, 'reject')}
                        disabled={actioningId === u.id}
                        className="flex-1 text-error border-error/20 bg-error/5 hover:bg-error/10"
                      >
                        Reject
                      </Button>
                      <Button
                        onClick={() => handleAction(u.id, 'approve')}
                        disabled={actioningId === u.id}
                        className="flex-1"
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
