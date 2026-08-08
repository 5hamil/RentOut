'use client';

import { useState } from 'react';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { request } from '@/lib/api';

export interface BookingCardProps {
  booking: any;
  mode: 'owner' | 'renter'; 
  onStatusChange?: () => void;
}

export default function BookingCard({ booking, mode, onStatusChange }: BookingCardProps) {
  const { user, accessToken } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');

  // Modals state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reportReason, setReportReason] = useState('');

  const { listing, status, startDate, endDate, totalPrice, depositAmount, reviews } = booking;
  const counterparty = mode === 'owner' ? booking.renter : booking.owner;
  
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  const hasReviewed = reviews?.some((r: any) => r.reviewerId === user?.id);

  const handleUpdate = async (action: 'accept' | 'decline' | 'complete') => {
    setIsUpdating(true);
    setError('');
    
    try {
      if (!accessToken) throw new Error('Not authenticated');
      await request(`/api/bookings/${booking.id}/status`, {
        method: 'PUT',
        token: accessToken,
        body: JSON.stringify({ action })
      });
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      setError(err.message || `Failed to ${action} booking`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReviewSubmit = async () => {
    setIsUpdating(true);
    setError('');
    try {
      if (!accessToken) throw new Error('Not authenticated');
      await request(`/api/reviews`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ bookingId: booking.id, rating: reviewRating, comment: reviewComment })
      });
      setIsReviewModalOpen(false);
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReportSubmit = async () => {
    setIsUpdating(true);
    setError('');
    try {
      if (!accessToken) throw new Error('Not authenticated');
      await request(`/api/reports`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ targetId: counterparty.id, reason: reportReason })
      });
      setIsReportModalOpen(false);
      alert('Report submitted successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setIsUpdating(false);
    }
  };

  // ─── DISPUTES ──────────────────────────────────────────────────────────────
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeFiles, setDisputeFiles] = useState<File[]>([]);

  const isDisputed = status === 'disputed' || booking.dispute;
  const isPrimaryFiler = booking.dispute?.filedById === user?.id;
  const counterEvidenceNeeded = isDisputed && !isPrimaryFiler && !booking.dispute?.opposingReason;

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setError('');
    try {
      if (!accessToken) throw new Error('Not authenticated');
      const formData = new FormData();
      if (counterEvidenceNeeded) {
        formData.append('opposingReason', disputeReason);
      } else {
        formData.append('reason', disputeReason);
      }
      disputeFiles.forEach(file => formData.append('images', file));

      const endpoint = counterEvidenceNeeded 
        ? `/api/disputes/${booking.dispute.id}/counter`
        : `/api/bookings/${booking.id}/dispute`;

      await request(endpoint, {
        method: 'POST',
        token: accessToken,
        body: formData
      });

      setIsDisputeModalOpen(false);
      alert(counterEvidenceNeeded ? 'Counter evidence submitted.' : 'Dispute filed successfully.');
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      setError(err.message || 'Failed to submit dispute evidence');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'requested': return <span className="rounded-full bg-warning/20 px-3 py-1 text-xs font-semibold text-warning-foreground">Requested</span>;
      case 'confirmed': return <span className="rounded-full bg-success/20 px-3 py-1 text-xs font-semibold text-success">Confirmed</span>;
      case 'ongoing': return <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">Ongoing</span>;
      case 'completed': return <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">Completed</span>;
      case 'cancelled': return <span className="rounded-full bg-error/10 px-3 py-1 text-xs font-semibold text-error">Cancelled</span>;
      default: return <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">{status}</span>;
    }
  };

  return (
    <>
      <div className="flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] sm:flex-row group">
        {/* Listing Image */}
        <div className="relative h-56 w-full shrink-0 bg-gray-50 sm:h-auto sm:w-56 overflow-hidden">
          <Image src={listing.images[0] || '/placeholder.png'} alt={listing.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col justify-between p-6 sm:p-8">
          <div>
            <div className="mb-3 flex items-start justify-between">
              <h3 className="text-xl font-heading font-bold text-foreground line-clamp-1 pr-4">{listing.title}</h3>
              {getStatusBadge()}
            </div>
            
            <div className="text-sm text-muted font-medium">
              {format(start, 'MMM d, yyyy')} – {format(end, 'MMM d, yyyy')}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative h-12 w-12 overflow-hidden rounded-full bg-gray-100 ring-2 ring-gray-50">
                  {counterparty?.profileImage ? (
                    <Image src={counterparty.profileImage} alt={counterparty.name || 'User'} fill className="object-cover" />
                  ) : (
                    <svg className="h-full w-full text-gray-300 p-1" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{mode === 'owner' ? 'Renter' : 'Owner'}: {counterparty?.name || 'Unknown'}</p>
                  {counterparty?.avgRating && (
                    <p className="text-xs font-medium text-muted mt-0.5 flex items-center gap-1">
                      <svg className="h-3 w-3 text-foreground" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                      {counterparty.avgRating.toFixed(1)}
                    </p>
                  )}
                </div>
              </div>

              {/* Report Issue - Available for confirmed/ongoing/completed */}
              {(status === 'confirmed' || status === 'ongoing' || status === 'completed') && (
                <button 
                  onClick={() => setIsReportModalOpen(true)}
                  className="text-xs font-medium text-muted hover:text-error transition-colors underline underline-offset-2"
                >
                  Report Issue
                </button>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-col justify-between gap-6 border-t border-gray-100 pt-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-2xl font-bold text-foreground tracking-tight">₹{totalPrice}</p>
              {status === 'confirmed' || status === 'ongoing' ? (
                <p className="text-xs font-semibold text-primary mt-1">Deposit held: ₹{depositAmount}</p>
              ) : (
                <p className="text-xs text-muted mt-1">+ ₹{depositAmount} deposit</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 sm:justify-end">
              {(status === 'confirmed' || status === 'ongoing') && (
                <a href={`/dashboard/chat/${booking.id}`} className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                  Open Chat
                </a>
              )}

              {/* Owner Request Actions */}
              {mode === 'owner' && status === 'requested' && (
                <>
                  <button onClick={() => handleUpdate('decline')} disabled={isUpdating} className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all shadow-sm">
                    Decline
                  </button>
                  <button onClick={() => handleUpdate('accept')} disabled={isUpdating} className="rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition-all shadow-sm">
                    {isUpdating ? 'Updating...' : 'Accept Request'}
                  </button>
                </>
              )}

              {/* Owner Completion Action */}
              {mode === 'owner' && (status === 'confirmed' || status === 'ongoing') && (
                <button onClick={() => handleUpdate('complete')} disabled={isUpdating} className="rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition-all shadow-sm">
                  {isUpdating ? 'Updating...' : 'Mark as Returned'}
                </button>
              )}

              {/* Leave Review */}
              {status === 'completed' && !hasReviewed && (
                <button onClick={() => setIsReviewModalOpen(true)} className="rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-all shadow-sm">
                  Leave a Review
                </button>
              )}
              {status === 'completed' && hasReviewed && (
                <span className="inline-flex items-center rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-500">
                  Review Submitted ✓
                </span>
              )}

              {/* Dispute Actions */}
              {(status === 'completed' || status === 'ongoing') && !isDisputed && (
                <button onClick={() => setIsDisputeModalOpen(true)} className="rounded-xl bg-error px-4 py-2 text-sm font-medium text-white hover:bg-error/90 transition">
                  File Dispute
                </button>
              )}
              {counterEvidenceNeeded && (
                <button onClick={() => setIsDisputeModalOpen(true)} className="rounded-xl bg-error px-4 py-2 text-sm font-medium text-white hover:bg-error/90 transition">
                  Submit Counter-Evidence
                </button>
              )}
              {isDisputed && !counterEvidenceNeeded && booking.dispute?.status !== 'resolved' && (
                <span className="inline-flex items-center rounded-xl bg-error/10 px-4 py-2 text-sm font-medium text-error border border-error/20">
                  Dispute Under Review
                </span>
              )}
              {isDisputed && booking.dispute?.status === 'resolved' && (
                <span className="inline-flex items-center rounded-xl bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 border border-purple-200">
                  Dispute Resolved
                </span>
              )}
            </div>

            {error && <p className="text-xs text-error w-full text-right">{error}</p>}
          </div>
        </div>
      </div>

      {/* Dispute Modal */}
      {isDisputeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-heading font-bold mb-4 text-foreground">{counterEvidenceNeeded ? 'Submit Counter-Evidence' : 'File a Dispute'}</h3>
            <form onSubmit={handleDisputeSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  {counterEvidenceNeeded ? 'Your response to the claim' : 'Reason for dispute'}
                </label>
                <textarea
                  required
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-error focus:ring-error"
                  placeholder="Explain what happened in detail..."
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">Photo Evidence (up to 5)</label>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) setDisputeFiles(Array.from(e.target.files).slice(0, 5));
                  }}
                  className="block w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-error/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-error hover:file:bg-error/20"
                />
                <p className="mt-1 text-xs text-muted">{disputeFiles.length} file(s) selected</p>
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsDisputeModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground" disabled={isUpdating}>
                  Cancel
                </button>
                <button type="submit" disabled={isUpdating || !disputeReason} className="rounded-xl bg-error px-4 py-2 text-sm font-bold text-white hover:bg-error/90 disabled:opacity-50">
                  {isUpdating ? 'Submitting...' : 'Submit Evidence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-heading font-bold mb-4 text-foreground">Review {counterparty.name}</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className={`text-2xl ${star <= reviewRating ? 'text-yellow-400' : 'text-gray-200'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">Comment</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-primary focus:ring-primary"
                placeholder="How was your experience?"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setIsReviewModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground">Cancel</button>
              <button onClick={handleReviewSubmit} disabled={isUpdating || !reviewComment} className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50">
                {isUpdating ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-heading font-bold mb-2 text-error">Report an Issue</h3>
            <p className="text-sm text-muted mb-4">Please describe the issue with this booking or user. This will be flagged for review.</p>
            
            <div className="mb-6">
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-error focus:ring-error"
                placeholder="What went wrong?"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setIsReportModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground">Cancel</button>
              <button onClick={handleReportSubmit} disabled={isUpdating || !reportReason} className="rounded-xl bg-error px-4 py-2 text-sm font-medium text-white hover:bg-error/90 disabled:opacity-50">
                {isUpdating ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
