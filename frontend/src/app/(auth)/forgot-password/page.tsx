'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApi, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

function Logo() {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/20">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setIsLoading(true);
    try {
      const { message } = await authApi.forgotPassword(email.trim());
      setSuccess(message);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        <Card className="px-8 py-10">
          <div className="mb-8 text-center">
            <Logo />
            <h1 className="mt-8 text-2xl font-heading font-bold tracking-tight text-foreground">Reset your password</h1>
            <p className="mt-2 text-sm text-muted">
              Enter your email and we&apos;ll send a reset link.
            </p>
          </div>

          {success ? (
            <div className="rounded-xl border border-primary/20 bg-primary-light/50 px-5 py-4 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.82 9.85 19.79 19.79 0 01.75 1.17 2 2 0 012.73 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.16 6.16l1.08-1.08a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 15.07v1.85z"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground">{success}</p>
              <p className="mt-1 text-xs text-muted">Check your spam folder if you don&apos;t see it.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {error && (
                <div className="flex items-start gap-3 rounded-xl border border-error/20 bg-error/10 px-4 py-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-error" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm.75 4.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5zm-.75 6.5a.875.875 0 110-1.75.875.875 0 010 1.75z"/>
                  </svg>
                  <p className="text-sm text-error">{error}</p>
                </div>
              )}

              <Input
                id="email" 
                label="Email address"
                type="email" 
                autoComplete="email"
                placeholder="you@example.com"
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />

              <Button
                type="submit" 
                isLoading={isLoading}
                className="w-full mt-2"
              >
                Send reset link
              </Button>
            </form>
          )}
        </Card>

        <p className="mt-6 text-center text-sm text-muted">
          Remember your password?{' '}
          <Link href="/login" className="font-semibold text-primary hover:text-primary-hover transition-colors">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
