'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function AdminDisputesPage() {
  const { accessToken } = useAuth();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [activeDispute, setActiveDispute] = useState<any>(null);
  const [resolutionAction, setResolutionAction] = useState<'release' | 'forfeit' | 'partially_withhold' | ''>('');
  const [withholdAmount, setWithholdAmount] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDisputes = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/disputes?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch disputes');
      const data = await res.json();
      setDisputes(data.disputes);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, page]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !activeDispute) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/disputes/${activeDispute.id}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ 
          action: resolutionAction,
          amount: withholdAmount,
          resolutionNotes
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to resolve dispute');
      }

      alert('Dispute resolved successfully!');
      setActiveDispute(null);
      setResolutionAction('');
      setWithholdAmount('');
      setResolutionNotes('');
      fetchDisputes();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">Dispute Resolutions</h1>
        <p className="text-sm text-muted">Total: {total}</p>
      </div>
      
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="bg-muted/10 text-xs uppercase text-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Booking ID</th>
                <th className="px-6 py-4 font-medium">Filed By</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Deposit</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">Loading...</td>
                </tr>
              ) : disputes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">No disputes found.</td>
                </tr>
              ) : (
                disputes.map(d => (
                  <tr key={d.id} className="hover:bg-muted/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-foreground">{d.bookingId}</td>
                    <td className="px-6 py-4">
                      <span className="text-foreground font-medium">{d.filedBy.name}</span> <br/>
                      <span className="text-xs text-muted">{d.filedBy.email}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize ${
                        d.status === 'open' ? 'bg-warning/20 text-warning-foreground' :
                        d.status === 'under_review' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {d.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">
                      ₹{d.booking.depositAmount}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        onClick={() => setActiveDispute(d)}
                      >
                        Review Claim
                      </Button>
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
              <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} variant="outline">Previous</Button>
              <Button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} variant="outline">Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail & Resolution Modal */}
      {activeDispute && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-xl flex flex-col lg:flex-row gap-6">
            
            {/* Left: Evidence Panel */}
            <div className="flex-1 border-r border-border pr-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-heading font-bold text-foreground">Dispute Evidence</h2>
                <div className="text-sm text-muted text-right">
                  Booking ID: <span className="font-mono text-foreground">{activeDispute.bookingId}</span><br/>
                  Deposit Held: <strong className="text-foreground">₹{activeDispute.booking.depositAmount}</strong>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Primary Filer */}
                <div className="bg-error/5 p-4 rounded-xl border border-error/20">
                  <div className="mb-2">
                    <span className="text-xs font-bold uppercase text-error tracking-wider">Filed By ({activeDispute.filedById === activeDispute.booking.ownerId ? 'Owner' : 'Renter'})</span>
                    <h3 className="text-lg font-bold text-foreground">{activeDispute.filedBy.name}</h3>
                  </div>
                  <p className="text-sm text-foreground bg-background p-3 rounded-lg border border-error/20 mb-4 whitespace-pre-wrap">{activeDispute.reason}</p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {activeDispute.evidenceImages?.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="relative h-32 block bg-muted/20 rounded-lg overflow-hidden group">
                        <Image src={url} alt="Evidence" fill className="object-cover group-hover:opacity-80 transition" />
                      </a>
                    ))}
                  </div>
                </div>

                {/* Opposing Filer */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                  <div className="mb-2">
                    <span className="text-xs font-bold uppercase text-blue-600 tracking-wider">Counter-Evidence ({activeDispute.filedById === activeDispute.booking.ownerId ? 'Renter' : 'Owner'})</span>
                    <h3 className="text-lg font-bold text-foreground">
                      {activeDispute.filedById === activeDispute.booking.ownerId ? activeDispute.booking.renter.name : activeDispute.booking.owner.name}
                    </h3>
                  </div>
                  
                  {activeDispute.opposingReason ? (
                    <>
                      <p className="text-sm text-foreground bg-background p-3 rounded-lg border border-blue-200 mb-4 whitespace-pre-wrap">{activeDispute.opposingReason}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {activeDispute.opposingEvidenceImages?.map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="relative h-32 block bg-muted/20 rounded-lg overflow-hidden group">
                            <Image src={url} alt="Counter Evidence" fill className="object-cover group-hover:opacity-80 transition" />
                          </a>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center min-h-[200px]">
                      <p className="text-muted italic text-sm">No counter-evidence submitted yet.</p>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Right: Resolution Panel */}
            <div className="w-full lg:w-96 flex flex-col">
              <h2 className="text-2xl font-heading font-bold mb-6 text-foreground">Resolution Action</h2>
              
              {activeDispute.status === 'resolved' ? (
                <div className="bg-success/10 p-6 rounded-2xl border border-success/20 flex-1">
                  <h3 className="text-success font-bold mb-2">Dispute Resolved</h3>
                  <p className="text-sm text-success mb-4">Amount Withheld: <strong>₹{activeDispute.depositResolutionAmount}</strong></p>
                  <p className="text-sm text-foreground bg-background p-3 rounded-lg border border-success/20 whitespace-pre-wrap">{activeDispute.resolutionNotes}</p>
                  <Button onClick={() => setActiveDispute(null)} variant="outline" className="mt-6 w-full">Close</Button>
                </div>
              ) : (
                <form onSubmit={handleResolve} className="flex flex-col flex-1">
                  <div className="mb-6 space-y-3">
                    <label className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:bg-muted/5 transition">
                      <input type="radio" name="action" value="release" checked={resolutionAction === 'release'} onChange={(e) => setResolutionAction(e.target.value as any)} className="w-4 h-4 text-primary" />
                      <div className="text-sm">
                        <span className="font-bold text-foreground block">Release Full Deposit</span>
                        <span className="text-muted">Refund ₹{activeDispute.booking.depositAmount} to the Renter</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:bg-muted/5 transition">
                      <input type="radio" name="action" value="forfeit" checked={resolutionAction === 'forfeit'} onChange={(e) => setResolutionAction(e.target.value as any)} className="w-4 h-4 text-error" />
                      <div className="text-sm">
                        <span className="font-bold text-foreground block">Forfeit Full Deposit</span>
                        <span className="text-muted">Pay ₹{activeDispute.booking.depositAmount} to the Owner</span>
                      </div>
                    </label>

                    <label className="flex flex-col gap-2 p-3 rounded-xl border border-border cursor-pointer hover:bg-muted/5 transition">
                      <div className="flex items-center gap-3">
                        <input type="radio" name="action" value="partially_withhold" checked={resolutionAction === 'partially_withhold'} onChange={(e) => setResolutionAction(e.target.value as any)} className="w-4 h-4 text-blue-600" />
                        <div className="text-sm">
                          <span className="font-bold text-foreground block">Partially Withhold</span>
                          <span className="text-muted">Split deposit between parties</span>
                        </div>
                      </div>
                      {resolutionAction === 'partially_withhold' && (
                        <div className="mt-2 ml-7">
                          <label className="text-xs font-semibold text-foreground">Amount to pay Owner (₹)</label>
                          <Input 
                            type="number" 
                            min="1" 
                            max={activeDispute.booking.depositAmount} 
                            value={withholdAmount} 
                            onChange={(e) => setWithholdAmount(e.target.value)} 
                            className="mt-1"
                            placeholder={`Max ₹${activeDispute.booking.depositAmount}`}
                            required
                          />
                        </div>
                      )}
                    </label>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-bold text-foreground mb-2">Resolution Notes</label>
                    <textarea 
                      required
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      rows={5}
                      className="w-full rounded-xl border border-border p-3 text-sm focus:border-primary focus:ring-primary"
                      placeholder="Explain the decision to both parties..."
                    />
                  </div>

                  <div className="mt-auto flex justify-end gap-3 pt-6 border-t border-border">
                    <Button type="button" onClick={() => setActiveDispute(null)} variant="outline">Cancel</Button>
                    <Button type="submit" disabled={!resolutionAction || isSubmitting}>
                      {isSubmitting ? 'Resolving...' : 'Confirm Resolution'}
                    </Button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
