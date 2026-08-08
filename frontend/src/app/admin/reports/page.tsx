'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function AdminReportsPage() {
  const { accessToken } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/reports?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch reports');
      const data = await res.json();
      setReports(data.reports);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, page]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const changeStatus = async (reportId: string, status: string) => {
    if (!accessToken) return;
    setActioningId(reportId);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/reports/${reportId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update report status');
      
      // Update local state
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">Reports & Disputes</h1>
        <p className="text-sm text-muted">Total: {total}</p>
      </div>
      
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="bg-muted/10 text-xs uppercase text-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Reporter</th>
                <th className="px-6 py-4 font-medium">Target ID</th>
                <th className="px-6 py-4 font-medium">Reason</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">Loading...</td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">No reports found.</td>
                </tr>
              ) : (
                reports.map(r => (
                  <tr key={r.id} className="hover:bg-muted/5 transition-colors">
                    <td className="px-6 py-4">
                      {r.reporter.name} <br/>
                      <span className="text-xs text-muted">{r.reporter.email}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {r.targetId} <br/>
                      <span className="text-[10px] uppercase text-muted bg-muted/10 px-1 rounded">{r.targetType}</span>
                    </td>
                    <td className="px-6 py-4 max-w-xs break-words">{r.reason}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize ${
                        r.status === 'pending' ? 'bg-warning/20 text-warning-foreground' :
                        r.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                        r.status === 'actioned' ? 'bg-success/20 text-success' :
                        'bg-gray-100 text-gray-800' // dismissed
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <select
                        disabled={actioningId === r.id}
                        value={r.status}
                        onChange={(e) => changeStatus(r.id, e.target.value)}
                        className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                      >
                        <option value="pending">Pending</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="dismissed">Dismissed</option>
                        <option value="actioned">Actioned</option>
                      </select>
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
