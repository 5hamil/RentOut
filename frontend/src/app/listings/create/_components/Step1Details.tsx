'use client';

import { useState } from 'react';
import { ListingDraft, ListingCategory, LISTING_CATEGORIES } from '@/types/listing';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// ─── Category metadata ─────────────────────────────────────────────────────

const CATEGORY_META: Record<ListingCategory, { label: string; icon: React.ReactNode; desc: string }> = {
  camera: {
    label: 'Camera',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
    ),
    desc: 'DSLRs, mirrorless, action cams',
  },
  drone: {
    label: 'Drone',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
        <path d="M12 12m-2 0a2 2 0 104 0 2 2 0 10-4 0"/>
        <path d="M6 6l2.5 2.5M15.5 8.5L18 6M6 18l2.5-2.5M15.5 15.5L18 18"/>
        <circle cx="4" cy="4" r="2"/><circle cx="20" cy="4" r="2"/>
        <circle cx="4" cy="20" r="2"/><circle cx="20" cy="20" r="2"/>
      </svg>
    ),
    desc: 'Aerial photography drones',
  },
  projector: {
    label: 'Projector',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
        <rect x="1" y="6" width="22" height="12" rx="2"/><circle cx="17" cy="12" r="2"/>
        <path d="M7 12h4M5 8h2M5 16h2"/>
      </svg>
    ),
    desc: 'Home theatre, business projectors',
  },
  console: {
    label: 'Console',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
        <rect x="2" y="6" width="20" height="12" rx="2"/>
        <path d="M6 12h4M8 10v4M16 11h2M14 13h2"/>
      </svg>
    ),
    desc: 'PS5, Xbox, Nintendo Switch',
  },
  laptop: {
    label: 'Laptop',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M0 21h24M8 21l2-4h4l2 4"/>
      </svg>
    ),
    desc: 'MacBooks, Windows laptops',
  },
  audio: {
    label: 'Audio',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
        <path d="M3 18v-6a9 9 0 0118 0v6"/>
        <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/>
      </svg>
    ),
    desc: 'Speakers, microphones, mixers',
  },
  other: {
    label: 'Other',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    desc: 'Any other electronics',
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  draft: ListingDraft;
  onChange: (u: Partial<ListingDraft>) => void;
  onNext: () => void;
}

const TITLE_MAX = 80;
const DESC_MAX = 1000;

// ─── Component ────────────────────────────────────────────────────────────────

export default function Step1Details({ draft, onChange, onNext }: Props) {
  const [errors, setErrors] = useState<Partial<Record<'category' | 'title' | 'description', string>>>({});

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!draft.category) errs.category = 'Please select a category.';
    if (!draft.title.trim()) errs.title = 'Title is required.';
    else if (draft.title.length < 10) errs.title = 'Title should be at least 10 characters.';
    if (!draft.description.trim()) errs.description = 'Description is required.';
    else if (draft.description.length < 30) errs.description = 'Please write at least 30 characters.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  return (
    <div className="flex flex-col h-full py-2">
      
      {/* Category Grid */}
      <div className="mb-12">
        <label className="mb-4 block text-sm font-semibold text-foreground uppercase tracking-wider text-muted">Category</label>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {LISTING_CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            const isSelected = draft.category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  onChange({ category: cat });
                  setErrors((e) => ({ ...e, category: '' }));
                }}
                className={cn(
                  "group relative flex flex-col items-center gap-3 rounded-3xl border-2 p-5 text-center transition-all duration-200 overflow-hidden",
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-gray-100 bg-white hover:border-gray-300 shadow-sm'
                )}
              >
                {/* Active indicator dot */}
                <div className={cn(
                  "absolute top-3 right-3 h-2.5 w-2.5 rounded-full transition-transform duration-300",
                  isSelected ? "bg-primary scale-100" : "bg-transparent scale-0"
                )} />

                <div className={cn(
                  "p-3 rounded-2xl transition-colors duration-200",
                  isSelected ? "bg-white text-primary shadow-sm" : "bg-gray-50 text-muted group-hover:bg-gray-100 group-hover:text-foreground"
                )}>
                  {meta.icon}
                </div>
                
                <div>
                  <span className={cn("block text-sm font-bold", isSelected ? 'text-primary' : 'text-foreground')}>
                    {meta.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        {errors.category && (
          <p className="mt-3 text-sm font-medium text-error flex items-center gap-1.5">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {errors.category}
          </p>
        )}
      </div>

      <div className="mb-12">
        <label className="mb-4 block text-sm font-semibold text-foreground uppercase tracking-wider text-muted">Title</label>
        <div className="relative">
          <Input
            value={draft.title}
            onChange={(e) => {
              if (e.target.value.length <= TITLE_MAX) {
                onChange({ title: e.target.value });
                setErrors((e) => ({ ...e, title: '' }));
              }
            }}
            placeholder="e.g. Sony A7S III Complete Filmmaking Kit"
            className={cn(
              "text-lg py-7 px-5 rounded-2xl border-gray-200 shadow-sm transition-all focus:border-primary focus:ring-4 focus:ring-primary/10",
              errors.title && "border-error focus:border-error focus:ring-error/10"
            )}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted/60">
            {draft.title.length}/{TITLE_MAX}
          </div>
        </div>
        {errors.title && (
          <p className="mt-2 text-sm font-medium text-error">
            {errors.title}
          </p>
        )}
      </div>

      <div className="mb-12">
        <label className="mb-4 block text-sm font-semibold text-foreground uppercase tracking-wider text-muted">Description</label>
        
        <div className="relative">
          <textarea
            value={draft.description}
            onChange={(e) => {
              if (e.target.value.length <= DESC_MAX) {
                onChange({ description: e.target.value });
                setErrors((e) => ({ ...e, description: '' }));
              }
            }}
            rows={6}
            placeholder="e.g. This camera is in perfect condition and comes with 2 batteries, a 64GB SD card, and a carrying case..."
            className={cn(
              "flex w-full rounded-2xl border bg-white px-5 py-4 text-base shadow-sm transition-all placeholder:text-muted/50 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50",
              errors.description 
                ? "border-error focus-visible:border-error focus-visible:ring-error/10" 
                : "border-gray-200"
            )}
          />
          <div className="absolute right-4 bottom-4 text-xs font-medium text-muted/60 bg-white/80 px-2 py-1 rounded-md backdrop-blur-sm">
            {draft.description.length}/{DESC_MAX}
          </div>
        </div>
        {errors.description && (
          <p className="mt-2 text-sm font-medium text-error">
            {errors.description}
          </p>
        )}
      </div>

      {/* Spacer to push button to bottom */}
      <div className="flex-1" />

      {/* Navigation Footer */}
      <div className="flex justify-end pt-8 pb-4">
        <Button onClick={handleNext} size="lg" className="px-10 rounded-full text-base font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          Next Step
        </Button>
      </div>
    </div>
  );
}
