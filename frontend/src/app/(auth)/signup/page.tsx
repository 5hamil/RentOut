'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

const CURRENT_TOS_VERSION = '1.0.0';

// ─── Sub-components ──────────────────────────────────────────────────────────

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

// ─── Password Strength Indicator ─────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
  ];
  const strength = checks.filter((c) => c.ok).length;
  const colors = ['', 'bg-error', 'bg-warning', 'bg-yellow-400', 'bg-success'];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn("h-1 flex-1 rounded-full transition-all duration-300", i <= strength ? colors[strength] : 'bg-gray-200')}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {checks.map((c) => (
          <span key={c.label} className={cn("flex items-center gap-1 text-[11px]", c.ok ? 'text-success' : 'text-muted')}>
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
              {c.ok ? (
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              ) : (
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1"/>
              )}
            </svg>
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Signup Page ─────────────────────────────────────────────────────────────

type FieldErrors = Partial<Record<string, string>>;

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    tosAccepted: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = (): FieldErrors => {
    const errs: FieldErrors = {};
    if (!form.name.trim()) errs.name = 'Full name is required.';
    if (!form.email.trim()) errs.email = 'Email address is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Please enter a valid email address.';
    if (!form.phone.trim()) errs.phone = 'Phone number is required.';
    if (!form.password) errs.password = 'Password is required.';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    else if (!/[A-Z]/.test(form.password)) errs.password = 'Add an uppercase letter.';
    else if (!/[a-z]/.test(form.password)) errs.password = 'Add a lowercase letter.';
    else if (!/\d/.test(form.password)) errs.password = 'Add a number.';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    if (!form.tosAccepted) errs.tosAccepted = 'You must accept all policies to continue.';
    return errs;
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setGlobalError('');

      const errs = validate();
      if (Object.keys(errs).length) {
        setFieldErrors(errs);
        return;
      }

      setIsLoading(true);
      try {
        await signup({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
          tosAccepted: true,
          tosVersion: CURRENT_TOS_VERSION,
        });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, signup, router],
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[460px]">
        <Card className="px-8 py-10">
          {/* Header */}
          <div className="mb-8 text-center">
            <Logo />
            <h1 className="mt-8 text-2xl font-heading font-bold tracking-tight text-foreground">Create your account</h1>
            <p className="mt-2 text-sm text-muted">Rent and lend electronics with confidence</p>
          </div>

          {/* Global Error */}
          {globalError && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-error/20 bg-error/10 px-4 py-3">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-error" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm.75 4.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5zm-.75 6.5a.875.875 0 110-1.75.875.875 0 010 1.75z"/>
              </svg>
              <p className="text-sm text-error">{globalError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <Input
              id="name" name="name" label="Full name" type="text"
              autoComplete="name" placeholder="Jane Smith"
              value={form.name} onChange={handleChange}
              error={fieldErrors.name} disabled={isLoading}
            />

            <Input
              id="email" name="email" label="Email address" type="email"
              autoComplete="email" placeholder="you@example.com"
              value={form.email} onChange={handleChange}
              error={fieldErrors.email} disabled={isLoading}
            />

            <Input
              id="phone" name="phone" label="Phone number" type="tel"
              autoComplete="tel" placeholder="+91 98765 43210"
              value={form.phone} onChange={handleChange}
              error={fieldErrors.phone} disabled={isLoading}
            />

            {/* Password with strength indicator */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password" name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  value={form.password} onChange={handleChange}
                  disabled={isLoading}
                  error={fieldErrors.password}
                  className="pr-11"
                />
                <button
                  type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-[22px] -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                  tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              <PasswordStrength password={form.password} />
            </div>

            <Input
              id="confirmPassword" name="confirmPassword" label="Confirm password"
              type="password" autoComplete="new-password" placeholder="Repeat your password"
              value={form.confirmPassword} onChange={handleChange}
              error={fieldErrors.confirmPassword} disabled={isLoading}
            />

            {/* ToS Clickwrap */}
            <div className={cn("rounded-xl border p-4 transition-colors", fieldErrors.tosAccepted ? 'border-error/50 bg-error/5' : 'border-gray-200 bg-gray-50')}>
              <label className="flex cursor-pointer items-start gap-3" htmlFor="tosAccepted">
                <div className="relative mt-0.5 shrink-0">
                  <input
                    id="tosAccepted" name="tosAccepted" type="checkbox"
                    checked={form.tosAccepted}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="peer sr-only"
                  />
                  <div className={cn("h-5 w-5 rounded-md border-2 transition-all duration-150 flex items-center justify-center", 
                    form.tosAccepted
                      ? 'border-primary bg-primary'
                      : fieldErrors.tosAccepted
                        ? 'border-error bg-white'
                        : 'border-gray-300 bg-white'
                  )}>
                    {form.tosAccepted && (
                      <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm leading-relaxed text-foreground">
                  I have read and agree to the{' '}
                  <Link href="/terms" className="font-semibold text-primary hover:underline" target="_blank">Terms of Service</Link>,{' '}
                  <Link href="/privacy" className="font-semibold text-primary hover:underline" target="_blank">Privacy Policy</Link>, and{' '}
                  <Link href="/damage-policy" className="font-semibold text-primary hover:underline" target="_blank">Damage & Liability Policy</Link>.{' '}
                  <span className="text-muted block mt-1">I understand that RentOut holds a security deposit for all rentals.</span>
                </span>
              </label>
              {fieldErrors.tosAccepted && (
                <p className="mt-2 text-xs text-error">{fieldErrors.tosAccepted}</p>
              )}
            </div>

            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full mt-2"
            >
              Create account
            </Button>
          </form>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-primary hover:text-primary-hover transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
