'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

// ─── Logo ───────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/20">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="white" fillOpacity="0.9"/>
          <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span className="text-2xl font-heading font-bold tracking-tight text-foreground">
        Rent<span className="text-primary">Out</span>
      </span>
    </div>
  );
}

// ─── Login Page ─────────────────────────────────────────────────────────────

type FieldErrors = Partial<Record<string, string>>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFieldErrors({});
      setGlobalError('');

      const errs: FieldErrors = {};
      if (!email) errs.email = 'Email is required.';
      if (!password) errs.password = 'Password is required.';
      if (Object.keys(errs).length) {
        setFieldErrors(errs);
        return;
      }

      setIsLoading(true);
      try {
        await login({ email, password });
        router.push('/dashboard');
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.errors?.length) {
            const mapped: FieldErrors = {};
            err.errors.forEach((e) => { if (e.field) mapped[e.field] = e.message; });
            setFieldErrors(mapped);
          } else {
            setGlobalError(err.message);
          }
        } else {
          setGlobalError('An unexpected error occurred. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, login, router],
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        <Card className="px-8 py-10">
          {/* Header */}
          <div className="mb-8 text-center">
            <Logo />
            <h1 className="text-3xl font-heading font-bold text-foreground">Welcome back</h1>
            <p className="mt-2 text-sm text-muted">Sign in to your RentOut account</p>
          </div>

          {/* Global Error */}
          {globalError && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-error/20 bg-error/10 px-4 py-3">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-error" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm.75 4.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5zm-.75 6.5a.875.875 0 110-1.75.875.875 0 010 1.75z" />
              </svg>
              <p className="text-sm text-error">{globalError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <Input
              id="email"
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              disabled={isLoading}
            />

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={fieldErrors.password}
                  disabled={isLoading}
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-[22px] -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full mt-2"
            >
              Sign in
            </Button>
          </form>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-muted">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="font-semibold text-primary hover:text-primary-hover transition-colors"
          >
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}
