'use client';

import Link from 'next/link';
import { AuthUser } from '@/types/auth';

interface VerificationBannerProps {
  user: AuthUser;
  /** The action the user was trying to perform, shown in the CTA context */
  actionLabel?: string;
}

const CONFIG = {
  unverified: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: (
      <svg className="h-5 w-5 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    title: 'Complete ID verification to list items or book rentals',
    body: 'RentOut requires all users to verify their identity before they can list electronics or request a booking. It only takes a few minutes.',
    cta: 'Start verification →',
    ctaHref: '/verify-identity',
    ctaStyle: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
  pending: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: (
      <svg className="h-5 w-5 shrink-0 text-blue-500 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    title: 'Your ID verification is under review',
    body: 'We\'re reviewing your submitted documents. This usually takes 1–2 business days. You\'ll be notified by email once approved.',
    cta: 'View status →',
    ctaHref: '/verify-identity/status',
    ctaStyle: 'bg-blue-500 hover:bg-blue-600 text-white',
  },
  rejected: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: (
      <svg className="h-5 w-5 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    ),
    title: 'ID verification was not successful — please resubmit',
    body: 'Your documents could not be verified. Please resubmit clear, valid government-issued ID. If you believe this is an error, contact support.',
    cta: 'Resubmit documents →',
    ctaHref: '/verify-identity/resubmit',
    ctaStyle: 'bg-red-500 hover:bg-red-600 text-white',
  },
  permanently_blocked: {
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    icon: (
      <svg className="h-5 w-5 shrink-0 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      </svg>
    ),
    title: 'Your account has been suspended',
    body: 'This account has been permanently suspended due to a violation of our policies. Please contact our support team for more information.',
    cta: 'Contact support →',
    ctaHref: '/support',
    ctaStyle: 'bg-gray-700 hover:bg-gray-800 text-white',
  },
} as const;

/**
 * VerificationBanner — displays a contextual alert banner based on the user's
 * verificationStatus. Should be rendered at the top of any page where the user
 * might need to perform an action that requires verification.
 *
 * Returns null for verified users.
 */
export function VerificationBanner({ user, actionLabel }: VerificationBannerProps) {
  if (user.verificationStatus === 'verified') return null;

  const config = CONFIG[user.verificationStatus as keyof typeof CONFIG];
  if (!config) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`rounded-2xl border ${config.bg} ${config.border} px-5 py-4`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        {/* Icon */}
        <div className="shrink-0 pt-0.5">{config.icon}</div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{config.title}</p>
          <p className="mt-0.5 text-sm text-gray-600">
            {actionLabel
              ? `To ${actionLabel}, you need to complete ID verification first. `
              : ''}
            {config.body}
          </p>
        </div>

        {/* CTA */}
        <div className="shrink-0">
          <Link
            href={config.ctaHref}
            className={`inline-flex items-center rounded-xl px-4 py-2 text-xs font-semibold
              transition-all duration-150 ${config.ctaStyle}
              focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            {config.cta}
          </Link>
        </div>
      </div>
    </div>
  );
}
