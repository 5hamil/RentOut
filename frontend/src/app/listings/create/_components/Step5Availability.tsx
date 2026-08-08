'use client';

import 'react-day-picker/style.css';
import { useState, useCallback } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, parseISO, isWithinInterval, startOfDay } from 'date-fns';
import { ListingDraft } from '@/types/listing';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  draft: ListingDraft;
  onChange: (u: Partial<ListingDraft>) => void;
  onPrev: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitError: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toIso = (date: Date) => format(date, 'yyyy-MM-dd');

// ─── Summary card ─────────────────────────────────────────────────────────────

function AvailabilitySummary({
  availabilityStart,
  availabilityEnd,
  blockedDates,
}: {
  availabilityStart: string;
  availabilityEnd: string;
  blockedDates: string[];
}) {
  if (!availabilityStart || !availabilityEnd) return null;

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Availability summary</p>
      <div className="space-y-2 text-sm">
        <div className="flex gap-3">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8"  y1="2" x2="8"  y2="6"/>
            <line x1="3"  y1="10" x2="21" y2="10"/>
          </svg>
          <div>
            <p className="font-medium text-foreground">
              {format(parseISO(availabilityStart), 'MMM d, yyyy')} →{' '}
              {format(parseISO(availabilityEnd),   'MMM d, yyyy')}
            </p>
            <p className="text-xs text-muted">Available window</p>
          </div>
        </div>

        {blockedDates.length > 0 && (
          <div className="flex gap-3">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-warning"
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"/>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
            <div>
              <p className="font-medium text-foreground">
                {blockedDates.length} date{blockedDates.length > 1 ? 's' : ''} blocked
              </p>
              <p className="text-xs text-muted">These dates won&apos;t be bookable</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared DayPicker CSS overrides ──────────────────────────────────────────
// react-day-picker v10 uses CSS custom-property class names.
// We inject a tiny <style> to apply our accent colour without fighting the library.
const CALENDAR_STYLE = `
  .rdp-day_button:hover { border-radius: 50%; background: #e6f7f2; }
  .rdp-selected .rdp-day_button { background: #00A67E !important; color: white !important; border-radius: 50%; }
  .rdp-range_start .rdp-day_button,
  .rdp-range_end   .rdp-day_button { background: #00A67E !important; color: white !important; border-radius: 50%; }
  .rdp-range_middle .rdp-day_button { background: #e6f7f2 !important; color: #00A67E !important; border-radius: 0; }
  .rdp-today .rdp-day_button { color: #00A67E; font-weight: 700; text-decoration: underline; }
  .rdp-disabled .rdp-day_button { opacity: 0.25; cursor: not-allowed; }
  /* Blocked dates (mode=multiple selected) */
  .rdp-multiple_selected .rdp-day_button { background: #fca5a5 !important; color: #dc2626 !important; text-decoration: line-through; border-radius: 50%; }
`;

// ─── Step 5 ───────────────────────────────────────────────────────────────────

export default function Step5Availability({
  draft,
  onChange,
  onPrev,
  onSubmit,
  isSubmitting,
  submitError,
}: Props) {
  const [fieldError, setFieldError] = useState('');

  const availabilityRange: DateRange = {
    from: draft.availabilityStart ? parseISO(draft.availabilityStart) : undefined,
    to:   draft.availabilityEnd   ? parseISO(draft.availabilityEnd)   : undefined,
  };

  const blockedDateObjects: Date[] = draft.blockedDates.filter(Boolean).map((d) => parseISO(d));

  const today = startOfDay(new Date());
  const hasRange = !!availabilityRange.from && !!availabilityRange.to;

  // ── Range handler ───────────────────────────────────────────────────────────

  const handleRangeSelect = useCallback(
    (range: DateRange | undefined) => {
      setFieldError('');
      if (!range) {
        onChange({ availabilityStart: '', availabilityEnd: '', blockedDates: [] });
        return;
      }
      onChange({
        availabilityStart: range.from ? toIso(range.from) : '',
        availabilityEnd:   range.to   ? toIso(range.to)   : '',
        // Drop any previously-blocked dates that now fall outside the new range
        blockedDates: draft.blockedDates.filter((d) => {
          if (!range.from || !range.to) return false;
          return isWithinInterval(parseISO(d), { start: range.from, end: range.to });
        }),
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft.blockedDates, onChange],
  );

  // ── Blocked-date toggle ─────────────────────────────────────────────────────

  const handleBlockedSelect = useCallback(
    (dates: Date[] | undefined) => {
      onChange({ blockedDates: (dates ?? []).map(toIso) });
    },
    [onChange],
  );

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!draft.availabilityStart || !draft.availabilityEnd) {
      setFieldError('Please select an availability window before publishing.');
      return;
    }
    onSubmit();
  };

  return (
    <>
      {/* Inject tiny accent-colour overrides for react-day-picker v10 */}
      <style>{CALENDAR_STYLE}</style>

      <div className="flex flex-col h-full py-2">
        <div className="mb-12">
          <h2 className="text-3xl font-heading font-extrabold text-foreground tracking-tight">Set your availability</h2>
          <p className="mt-2 text-lg text-muted">
            Define when your item is available to rent, then optionally block out specific dates.
          </p>
        </div>

        {/* ── Section 1: Availability window ──────────────────────────────── */}
        <div className="mb-12">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              1
            </div>
            <h3 className="text-lg font-bold text-foreground">When is your item available?</h3>
          </div>

          <div className="flex justify-center overflow-x-auto rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <DayPicker
              mode="range"
              selected={availabilityRange}
              onSelect={handleRangeSelect}
              startMonth={today}
              numberOfMonths={2}
              showOutsideDays={false}
              className="font-sans"
            />
          </div>

          {fieldError && (
            <p className="mt-4 text-center text-sm font-medium text-error">{fieldError}</p>
          )}
        </div>

        {/* ── Section 2: Block specific dates ─────────────────────────────── */}
        {hasRange && (
          <div className="mb-12">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/10 text-sm font-bold text-warning">
                2
              </div>
              <h3 className="text-lg font-bold text-foreground">Block unavailable dates</h3>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-muted">Optional</span>
            </div>
            <p className="mb-6 text-sm text-muted">
              Click a date within your window to block it (e.g. personal use, maintenance days). Blocked dates appear in red.
            </p>

            <div className="flex justify-center overflow-x-auto rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <DayPicker
                mode="multiple"
                selected={blockedDateObjects}
                onSelect={handleBlockedSelect}
                startMonth={availabilityRange.from}
                endMonth={availabilityRange.to}
                disabled={[
                  { before: availabilityRange.from! },
                  { after:  availabilityRange.to!   },
                ]}
                numberOfMonths={2}
                showOutsideDays={false}
                className="font-sans"
              />
            </div>

            {blockedDateObjects.length > 0 && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => onChange({ blockedDates: [] })}
                  className="text-sm font-semibold text-muted underline hover:text-foreground transition-colors"
                >
                  Clear all blocked dates
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Summary ─────────────────────────────────────────────────────── */}
        <div className="mb-12">
          <AvailabilitySummary
            availabilityStart={draft.availabilityStart}
            availabilityEnd={draft.availabilityEnd}
            blockedDates={draft.blockedDates}
          />
        </div>

        {/* Submit error */}
        {submitError && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-error/20 bg-error/5 px-5 py-4 text-sm text-error font-medium">
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {submitError}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Navigation Footer */}
        <div className="flex justify-between pt-8 pb-4">
          <Button variant="outline" type="button" onClick={onPrev} size="lg" className="px-6 rounded-full text-base font-bold border-gray-200 hover:bg-gray-50 transition-all">
            Back
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            size="lg"
            className="px-10 rounded-full text-base font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
                Publishing…
              </div>
            ) : (
              <div className="flex items-center gap-2">
                Publish Listing
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13"/>
                  <path d="M22 2L15 22 11 13 2 9l20-7z"/>
                </svg>
              </div>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
