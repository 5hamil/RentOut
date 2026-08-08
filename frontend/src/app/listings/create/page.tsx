'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ListingDraft, EMPTY_DRAFT } from '@/types/listing';
import { motion, AnimatePresence } from 'framer-motion';

import { request } from '@/lib/api';
import Step1Details from './_components/Step1Details';
import Step2Photos from './_components/Step2Photos';
import Step3Pricing from './_components/Step3Pricing';
import Step4Location from './_components/Step4Location';
import Step5Availability from './_components/Step5Availability';

const STORAGE_KEY = 'pr_create_listing_draft';
const TOTAL_STEPS = 5;

// Dynamic tips for the left panel based on current step
const STEP_INFO: Record<number, { title: string; subtitle: string; bgImage?: string }> = {
  1: {
    title: "Let's start with the basics",
    subtitle: "Categorize your gear and give it a catchy title to grab renters' attention.",
  },
  2: {
    title: "A picture is worth a thousand rentals",
    subtitle: "Upload clear, well-lit photos. Show any accessories that are included.",
  },
  3: {
    title: "Price it right",
    subtitle: "Set a fair daily rate and a refundable deposit to protect your gear.",
  },
  4: {
    title: "Where is your gear located?",
    subtitle: "Renters will use this to see if they can pick it up easily.",
  },
  5: {
    title: "Set your availability",
    subtitle: "When can renters pick up your gear? Block out dates you need it yourself.",
  }
};

export default function CreateListingPage() {
  const router = useRouter();
  const { user, isLoading, accessToken } = useAuth();
  
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 for next, -1 for prev
  const [draft, setDraft] = useState<ListingDraft>(EMPTY_DRAFT);
  const [draftSaved, setDraftSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Restore draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setDraft(JSON.parse(saved));
    } catch {
      // ignore parse errors
    }
  }, []);

  // Persist draft to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    setDraftSaved(true);
    const t = setTimeout(() => setDraftSaved(false), 2000);
    return () => clearTimeout(t);
  }, [draft]);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login?redirect=/listings/create');
    }
  }, [user, isLoading, router]);

  const updateDraft = useCallback((updates: Partial<ListingDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  }, []);

  const goNext = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, []);
  
  const goPrev = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        category: draft.category,
        title: draft.title,
        description: draft.description,
        images: draft.images.map((img) => img.url),
        pricePerDay: parseFloat(draft.pricePerDay),
        weeklyDiscount: draft.weeklyDiscount ? parseFloat(draft.weeklyDiscount) : null,
        depositAmount: parseFloat(draft.depositAmount),
        location: draft.location,
        latitude: draft.latitude,
        longitude: draft.longitude,
        availabilityStart: new Date(draft.availabilityStart).toISOString(),
        availabilityEnd: new Date(draft.availabilityEnd).toISOString(),
        blockedDates: (draft.blockedDates || []).map(d => new Date(d).toISOString()),
      };

      await request('/api/listings', {
        method: 'POST',
        token: accessToken || undefined,
        body: JSON.stringify(payload),
      });

      localStorage.removeItem(STORAGE_KEY);
      router.push('/dashboard');
    } catch (err: any) {
      if (err.errors && Array.isArray(err.errors)) {
        setSubmitError(err.errors.map((e: any) => e.message).join(' | '));
      } else {
        setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [draft, accessToken, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Animation variants
  const variants = {
    initial: (direction: number) => ({
      x: direction > 0 ? '20%' : '-20%',
      opacity: 0,
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] }
    },
    exit: (direction: number) => ({
      x: direction > 0 ? '-20%' : '20%',
      opacity: 0,
      transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] }
    }),
  };

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div className="flex h-screen w-full flex-col md:flex-row overflow-hidden bg-white">
      
      {/* LEFT PANEL (Tips & Progress) */}
      <div className="hidden md:flex w-[40%] max-w-md flex-col justify-between bg-[#0a0a0a] p-12 text-white relative overflow-hidden">
        
        {/* Subtle background glow */}
        <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-gradient-to-br from-primary/20 via-transparent to-transparent blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10">
          <button
            onClick={() => router.back()}
            className="group mb-16 inline-flex items-center gap-2 text-sm font-medium text-white/60 transition-colors hover:text-white"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-colors group-hover:bg-white/20">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </div>
            Exit
          </button>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="text-4xl font-heading font-extrabold tracking-tight mb-4">
                {STEP_INFO[step]?.title}
              </h1>
              <p className="text-lg text-white/60 leading-relaxed">
                {STEP_INFO[step]?.subtitle}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Custom Progress Indicator */}
        <div className="relative z-10 mt-12">
          <div className="flex items-center justify-between mb-2 text-sm font-medium text-white/60">
            <span>Step {step} of {TOTAL_STEPS}</span>
            <div className={`flex items-center gap-1.5 transition-opacity duration-300 ${draftSaved ? 'opacity-100' : 'opacity-0'}`}>
              <svg className="h-3.5 w-3.5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Draft saved
            </div>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: `${((step - 1) / TOTAL_STEPS) * 100}%` }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        </div>
      </div>

      {/* MOBILE HEADER */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-100 bg-white">
        <button onClick={() => router.back()} className="p-2">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span className="text-sm font-medium">Step {step} of {TOTAL_STEPS}</span>
        <div className="w-9" /> {/* spacer for centering */}
      </div>
      
      {/* MOBILE PROGRESS */}
      <div className="h-1 w-full md:hidden bg-gray-100">
        <motion.div 
          className="h-full bg-primary"
          initial={{ width: `${((step - 1) / TOTAL_STEPS) * 100}%` }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>

      {/* RIGHT PANEL (Form Content) */}
      <div className="flex-1 flex flex-col h-full bg-white relative">
        <div className="flex-1 overflow-y-auto px-4 py-8 md:p-12 lg:p-16">
          <div className="mx-auto max-w-2xl w-full h-full">
            <AnimatePresence custom={direction} mode="wait">
              <motion.div
                key={step}
                custom={direction}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="pb-24 h-full"
              >
                {step === 1 && (
                  <Step1Details draft={draft} onChange={updateDraft} onNext={goNext} />
                )}
                {step === 2 && (
                  <Step2Photos draft={draft} onChange={updateDraft} onNext={goNext} onPrev={goPrev} />
                )}
                {step === 3 && (
                  <Step3Pricing draft={draft} onChange={updateDraft} onNext={goNext} onPrev={goPrev} />
                )}
                {step === 4 && (
                  <Step4Location draft={draft} onChange={updateDraft} onNext={goNext} onPrev={goPrev} />
                )}
                {step === 5 && (
                  <Step5Availability
                    draft={draft}
                    onChange={updateDraft}
                    onPrev={goPrev}
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                    submitError={submitError}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
      
    </div>
  );
}
