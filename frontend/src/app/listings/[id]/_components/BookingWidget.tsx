'use client';

import { useState } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { parseISO, format, isWithinInterval, startOfDay } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import 'react-day-picker/style.css';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { request } from '@/lib/api';

// Premium minimalist calendar styling
const CALENDAR_STYLE = `
  .rdp-day_button:hover { border-radius: 9999px; background: #f3f4f6; }
  .rdp-selected .rdp-day_button { background: #000000 !important; color: white !important; border-radius: 9999px; }
  .rdp-range_start .rdp-day_button,
  .rdp-range_end   .rdp-day_button { background: #000000 !important; color: white !important; border-radius: 9999px; }
  .rdp-range_middle .rdp-day_button { background: #f3f4f6 !important; color: #000000 !important; border-radius: 0; }
  .rdp-today .rdp-day_button { font-weight: 700; border: 1px solid #e5e7eb; border-radius: 9999px; }
  .rdp-disabled .rdp-day_button { opacity: 0.2; cursor: not-allowed; text-decoration: line-through; }
  .rdp-button:focus-visible { outline: 2px solid #000000; outline-offset: 2px; }
`;

interface BookingWidgetProps {
  listingId: string;
  pricePerDay: number;
  depositAmount: number;
  availabilityStart: string;
  availabilityEnd: string;
  blockedDates: string[];
  bookings: { startDate: string; endDate: string }[];
  onBookingSuccess: () => void;
}

export default function BookingWidget({
  listingId,
  pricePerDay,
  depositAmount,
  availabilityStart,
  availabilityEnd,
  blockedDates,
  bookings,
  onBookingSuccess
}: BookingWidgetProps) {
  const { user, accessToken } = useAuth();
  
  const [range, setRange] = useState<DateRange | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ─── Calculate Disabled Dates ───────────────────────────────────────────────
  
  const today = startOfDay(new Date());
  const aStart = parseISO(availabilityStart);
  const aEnd = parseISO(availabilityEnd);

  // Convert blocked/booked dates to Date objects
  const explicitlyBlocked = blockedDates.map(d => parseISO(d));
  
  // Create a function to check if a single date is disabled
  const isDateDisabled = (date: Date) => {
    const dTime = date.getTime();
    
    // Before today or before availability starts
    if (date < today) return true;
    if (aStart > today && date < aStart) return true;
    
    // After availability ends
    if (date > aEnd) return true;
    
    // Owner's explicitly blocked dates
    if (explicitlyBlocked.some(d => d.getTime() === dTime)) return true;
    
    // Booked ranges
    if (bookings.some(b => {
      const bStart = parseISO(b.startDate).getTime();
      const bEnd = parseISO(b.endDate).getTime();
      return dTime >= bStart && dTime <= bEnd;
    })) return true;

    return false;
  };

  // ─── Check for overlap in current selection ───────────────────────────────
  
  // Since react-day-picker allows selecting a range that spans across a disabled date,
  // we must manually validate that the selected range doesn't overlap any blocked dates.
  const isRangeValid = (r: DateRange | undefined) => {
    if (!r || !r.from || !r.to) return true;
    
    // Check explicitly blocked
    const hasBlocked = explicitlyBlocked.some(d => isWithinInterval(d, { start: r.from!, end: r.to! }));
    if (hasBlocked) return false;

    // Check booked ranges (overlap logic)
    const hasBooked = bookings.some(b => {
      const bStart = parseISO(b.startDate);
      const bEnd = parseISO(b.endDate);
      return r.from! <= bEnd && r.to! >= bStart;
    });

    return !hasBooked;
  };

  const handleSelect = (newRange: DateRange | undefined) => {
    setError('');
    
    if (newRange?.from && newRange?.to && !isRangeValid(newRange)) {
      setError('Selected range includes unavailable dates.');
      // Reset if invalid
      setRange({ from: newRange.from, to: undefined });
      return;
    }
    
    setRange(newRange);
  };

  // ─── Price Calculator ───────────────────────────────────────────────────────
  
  let days = 0;
  if (range?.from && range?.to) {
    const diffMs = range.to.getTime() - range.from.getTime();
    days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  }
  
  const totalPrice = days * pricePerDay;
  const totalWithDeposit = totalPrice + depositAmount;

  // ─── Submit ─────────────────────────────────────────────────────────────────
  
  const handleBook = async () => {
    if (!user) {
      window.location.href = `/login?redirect=/listings/${listingId}`;
      return;
    }
    
    // Bypass ID verification for initial MVP stage
    // if (user.verificationStatus !== 'verified') {
    //   setError('You must complete ID verification to request a booking.');
    //   return;
    // }

    if (!range?.from || !range?.to) {
      setError('Please select a valid date range.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await request('/api/bookings', {
        method: 'POST',
        token: accessToken || undefined,
        body: JSON.stringify({
          listingId,
          startDate: format(range.from, 'yyyy-MM-dd'),
          endDate: format(range.to, 'yyyy-MM-dd')
        })
      });

      onBookingSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="sticky top-28 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-gray-100 rounded-3xl bg-white">
      <style>{CALENDAR_STYLE}</style>
      
      {/* Price Header */}
      <div className="mb-6 flex items-end gap-2 border-b border-gray-100 pb-6">
        <span className="text-3xl font-heading font-bold text-foreground">₹{pricePerDay}</span>
        <span className="mb-1 text-sm text-muted">/ day</span>
      </div>

      {/* Calendar */}
      <div className="mb-6 flex justify-center rounded-xl bg-gray-50/80 py-2 border border-gray-100">
        <DayPicker
          mode="range"
          selected={range}
          onSelect={handleSelect}
          disabled={isDateDisabled}
          startMonth={today}
          showOutsideDays={false}
          className="scale-90 sm:scale-100"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-xl bg-error/5 p-3 text-sm text-error border border-error/20">
          {error}
        </div>
      )}

      {/* Pricing Breakdown */}
      {days > 0 ? (
        <div className="mb-6 space-y-3 text-sm">
          <div className="flex justify-between text-muted">
            <span>₹{pricePerDay} x {days} day{days > 1 ? 's' : ''}</span>
            <span>₹{totalPrice}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span className="underline decoration-dashed underline-offset-4">Refundable deposit</span>
            <span>₹{depositAmount}</span>
          </div>
          <div className="my-2 border-t border-gray-100" />
          <div className="flex justify-between font-bold text-foreground">
            <span>Total due at booking</span>
            <span>₹{totalWithDeposit}</span>
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-4 text-center text-sm text-muted">
          Select dates to see pricing breakdown
        </div>
      )}

      {/* Submit Block */}
      <Button
        onClick={handleBook}
        disabled={isSubmitting || !range?.from || !range?.to}
        className="w-full py-3.5"
      >
        {isSubmitting ? 'Requesting...' : 'Request to Rent'}
      </Button>
      
      <p className="mt-4 text-center text-xs text-muted">
        You won&apos;t be charged until the owner confirms.
      </p>
    </Card>
  );
}
