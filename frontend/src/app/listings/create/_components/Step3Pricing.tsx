'use client';

import { useState } from 'react';
import { ListingDraft } from '@/types/listing';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface Props {
  draft: ListingDraft;
  onChange: (u: Partial<ListingDraft>) => void;
  onNext: () => void;
  onPrev: () => void;
}

interface FieldErrors {
  pricePerDay?: string;
  depositAmount?: string;
  weeklyDiscount?: string;
}

// ─── Currency input ───────────────────────────────────────────────────────────

function CurrencyInput({
  id, label, value, onChange, error, hint, placeholder = '0.00',
}: {
  id: string; label: string; value: string;
  onChange: (v: string) => void; error?: string; hint?: string; placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-3 block text-sm font-semibold text-foreground uppercase tracking-wider text-muted">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted">₹</span>
        <input
          id={id} type="number" min="0" step="0.01" placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full rounded-2xl border py-5 pl-12 pr-6 text-2xl font-bold text-foreground outline-none transition-all shadow-sm focus:ring-4",
            error 
              ? 'border-error bg-error/5 focus:border-error focus:ring-error/10' 
              : 'border-gray-200 bg-white focus:border-primary focus:ring-primary/10'
          )}
        />
      </div>
      {hint && !error && <p className="mt-2 text-sm text-muted">{hint}</p>}
      {error && <p className="mt-2 text-sm font-medium text-error">{error}</p>}
    </div>
  );
}

// ─── Preview calculation ──────────────────────────────────────────────────────

function PricingPreview({ pricePerDay, weeklyDiscount, depositAmount }: {
  pricePerDay: string; weeklyDiscount: string; depositAmount: string;
}) {
  const pDay = parseFloat(pricePerDay) || 0;
  const discPct = parseFloat(weeklyDiscount) || 0;
  const deposit = parseFloat(depositAmount) || 0;

  if (!pDay) return null;

  const weeklyOriginal = pDay * 7;
  const weeklyDiscounted = weeklyOriginal * (1 - discPct / 100);

  return (
    <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 shadow-sm">
      <p className="mb-4 text-sm font-bold uppercase tracking-wider text-primary">Pricing summary</p>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-base text-muted font-medium">Per day</span>
          <span className="text-xl font-bold text-foreground">₹{pDay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-base text-muted font-medium">Per week</span>
          <span className="text-xl font-bold text-foreground">
            {discPct > 0 ? (
              <>
                <span className="mr-3 text-muted/50 line-through text-base">₹{weeklyOriginal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                <span className="text-primary">₹{weeklyDiscounted.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </>
            ) : (
              `₹${weeklyOriginal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
            )}
          </span>
        </div>
        {deposit > 0 && (
          <div className="flex justify-between border-t border-primary/20 pt-4 mt-2">
            <span className="text-base text-muted font-medium">Security deposit</span>
            <span className="text-xl font-bold text-foreground">₹{deposit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {discPct > 0 && (
          <div className="mt-4 rounded-2xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary flex items-center gap-2">
            <span>🎉</span>
            <span>Renters save ₹{(weeklyOriginal - weeklyDiscounted).toLocaleString('en-IN', { minimumFractionDigits: 2 })} when booking weekly</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────

export default function Step3Pricing({ draft, onChange, onNext, onPrev }: Props) {
  const [errors, setErrors] = useState<FieldErrors>({});

  const validate = (): boolean => {
    const errs: FieldErrors = {};
    const price = parseFloat(draft.pricePerDay);
    const deposit = parseFloat(draft.depositAmount);
    const discount = parseFloat(draft.weeklyDiscount);

    if (!draft.pricePerDay || isNaN(price) || price <= 0) errs.pricePerDay = 'Enter a valid daily price.';
    if (!draft.depositAmount || isNaN(deposit) || deposit < 0) errs.depositAmount = 'Enter a valid deposit amount (0 if no deposit).';
    if (draft.weeklyDiscount && (isNaN(discount) || discount < 0 || discount > 70))
      errs.weeklyDiscount = 'Weekly discount must be between 0% and 70%.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  return (
    <div className="flex flex-col h-full py-2">
      <div className="mb-12">
        <h2 className="text-3xl font-heading font-extrabold text-foreground tracking-tight">Set your price</h2>
        <p className="mt-2 text-lg text-muted">Competitive pricing gets more bookings. Check what similar items rent for.</p>
      </div>

      <div className="space-y-10">
        {/* Price per day */}
        <CurrencyInput
          id="pricePerDay"
          label="Daily rental price"
          value={draft.pricePerDay}
          onChange={(v) => { onChange({ pricePerDay: v }); setErrors((e) => ({ ...e, pricePerDay: '' })); }}
          error={errors.pricePerDay}
          hint="The amount renters pay per day of rental."
          placeholder="500.00"
        />

        {/* Weekly discount */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <label htmlFor="weeklyDiscount" className="text-sm font-semibold text-foreground uppercase tracking-wider text-muted">
              Weekly discount
            </label>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-muted">Optional</span>
          </div>
          <div className="relative">
            <input
              id="weeklyDiscount"
              type="number" min="0" max="70" step="1"
              placeholder="e.g. 15"
              value={draft.weeklyDiscount}
              onChange={(e) => { onChange({ weeklyDiscount: e.target.value }); setErrors((er) => ({ ...er, weeklyDiscount: '' })); }}
              className={cn(
                "w-full rounded-2xl border py-5 pl-5 pr-12 text-2xl font-bold text-foreground outline-none transition-all shadow-sm focus:ring-4",
                errors.weeklyDiscount 
                  ? 'border-error bg-error/5 focus:border-error focus:ring-error/10' 
                  : 'border-gray-200 bg-white focus:border-primary focus:ring-primary/10'
              )}
            />
            <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted">%</span>
          </div>
          {errors.weeklyDiscount && <p className="mt-2 text-sm font-medium text-error">{errors.weeklyDiscount}</p>}
          <p className="mt-2 text-sm text-muted">Discount applied automatically when renter books 7+ days (max 70%).</p>
        </div>

        {/* Deposit */}
        <CurrencyInput
          id="depositAmount"
          label="Security deposit"
          value={draft.depositAmount}
          onChange={(v) => { onChange({ depositAmount: v }); setErrors((e) => ({ ...e, depositAmount: '' })); }}
          error={errors.depositAmount}
          hint="Held securely. Returned on safe return of your item. Enter 0 if not applicable."
          placeholder="2000.00"
        />

        {/* Deposit info callout */}
        <div className="flex gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>
          <p className="text-sm leading-relaxed text-blue-900/80 font-medium">
            RentOut holds the deposit in escrow. If the renter returns the item undamaged, it&apos;s released automatically.
          </p>
        </div>

        {/* Pricing preview */}
        <PricingPreview
          pricePerDay={draft.pricePerDay}
          weeklyDiscount={draft.weeklyDiscount}
          depositAmount={draft.depositAmount}
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Navigation Footer */}
      <div className="flex justify-between pt-12 pb-4">
        <Button variant="outline" type="button" onClick={onPrev} size="lg" className="px-6 rounded-full text-base font-bold border-gray-200 hover:bg-gray-50 transition-all">
          Back
        </Button>
        <Button type="button" onClick={() => { if (validate()) onNext(); }} size="lg" className="px-10 rounded-full text-base font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          Next Step
        </Button>
      </div>
    </div>
  );
}
