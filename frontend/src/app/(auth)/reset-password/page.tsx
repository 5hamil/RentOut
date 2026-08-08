'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

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

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ chars', ok: password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
  ];
  const strength = checks.filter((c) => c.ok).length;
  const colors = ['', 'bg-error', 'bg-warning', 'bg-yellow-400', 'bg-success'];
  
  if (!password) return null;
  
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={cn("h-1 flex-1 rounded-full transition-all", i <= strength ? colors[strength] : 'bg-gray-200')} />
        ))}
      </div>
    </div>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) setError('Invalid or missing reset token. Please request a new link.');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(password)) { setError('Add an uppercase letter.'); return; }
    if (!/\d/.test(password)) { setError('Add a number.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setIsLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
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
            <h1 className="mt-8 text-2xl font-heading font-bold tracking-tight text-foreground">Set new password</h1>
            <p className="mt-2 text-sm text-muted">Your new password must be different from the previous one.</p>
          </div>

          {success ? (
            <div className="rounded-xl border border-primary/20 bg-primary-light/50 px-5 py-4 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground">Password reset successfully!</p>
              <p className="mt-1 text-xs text-muted">Redirecting you to login…</p>
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

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">New password</label>
                <div className="relative">
                  <Input
                    id="password" 
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading || !token}
                    className="pr-11"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-[22px] -translate-y-1/2 text-muted hover:text-foreground transition-colors" tabIndex={-1}>
                    {showPassword
                      ? <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
                <PasswordStrength password={password} />
              </div>

              <div>
                <Input
                  id="confirm" 
                  label="Confirm password"
                  type="password" 
                  placeholder="Repeat your password"
                  value={confirm} 
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={isLoading || !token}
                />
              </div>

              <Button 
                type="submit" 
                disabled={!token}
                isLoading={isLoading}
                className="w-full mt-2"
              >
                Reset password
              </Button>
            </form>
          )}
        </Card>

        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="font-semibold text-primary hover:text-primary-hover transition-colors">
            &larr; Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
