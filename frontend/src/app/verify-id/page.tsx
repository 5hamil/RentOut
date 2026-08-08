'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function VerifyIdPage() {
  const router = useRouter();
  const { user, accessToken, isLoading: authLoading, refreshAccessToken } = useAuth();
  
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Protect route
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/verify-id');
    }
  }, [authLoading, user, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !accessToken) return;

    setIsUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('document', file);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/verifications/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: formData
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to upload document.');
      }

      setSuccess(true);
      // Refresh user context so the app knows we are 'pending'
      await refreshAccessToken();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (authLoading || !user) return null;

  const { verificationStatus, resubmissionCount } = user;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-8">
          <div className="flex flex-col items-center mb-6">
            <h1 className="mb-2 text-2xl font-heading font-bold tracking-tight text-foreground">Identity Verification</h1>
            <Badge variant={verificationStatus === 'verified' ? 'success' : verificationStatus === 'pending' ? 'warning' : verificationStatus === 'permanently_blocked' ? 'error' : 'default'}>
              {verificationStatus.replace('_', ' ')}
            </Badge>
          </div>
          
          {/* State: Verified */}
          {verificationStatus === 'verified' && (
            <div className="mt-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground">You are verified!</h3>
              <p className="mt-2 text-sm text-muted">You have full access to rent gear and list your own items.</p>
              <Button
                onClick={() => router.push('/dashboard')}
                className="mt-6 w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          )}

          {/* State: Pending */}
          {(verificationStatus === 'pending' || success) && !['verified', 'rejected', 'permanently_blocked'].includes(verificationStatus) && (
            <div className="mt-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground">Under Review</h3>
              <p className="mt-2 text-sm text-muted">Your identity document is currently being reviewed by our team. This usually takes less than 24 hours.</p>
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
                className="mt-6 w-full"
              >
                Return to Dashboard
              </Button>
            </div>
          )}

          {/* State: Permanently Blocked */}
          {verificationStatus === 'permanently_blocked' && (
            <div className="mt-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
                <svg className="h-8 w-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground">Verification Failed</h3>
              <p className="mt-2 text-sm text-muted">Your account has been restricted because we could not verify your identity after multiple attempts.</p>
              <a href="mailto:support@rentout.com" className="w-full block mt-6">
                <Button className="w-full">
                  Contact Support
                </Button>
              </a>
            </div>
          )}

          {/* State: Upload Form (unverified or rejected) */}
          {(verificationStatus === 'unverified' || verificationStatus === 'rejected') && !success && (
            <form onSubmit={handleUpload} className="mt-6">
              <p className="mb-4 text-sm text-muted">
                To keep the RentOut community safe, we require a valid government-issued ID (Passport, Driver's License, or National ID) before you can rent or list items.
              </p>

              {verificationStatus === 'rejected' && (
                <div className="mb-4 rounded-xl bg-error/10 p-4 text-sm text-error border border-error/20">
                  <strong>Upload Rejected.</strong> Your previous submission was rejected. You have {2 - resubmissionCount} attempt(s) remaining. Please ensure the document is clear and readable.
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground">Government ID Image</label>
                <div className="mt-1 flex justify-center rounded-xl border-2 border-dashed border-gray-300 px-6 pb-6 pt-5 hover:bg-gray-50 transition-colors">
                  <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-muted justify-center">
                      <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-semibold text-primary hover:text-primary-hover focus-within:outline-none">
                        <span>Upload a file</span>
                        <input id="file-upload" name="file-upload" type="file" accept="image/png, image/jpeg, application/pdf" className="sr-only" onChange={handleFileChange} />
                      </label>
                    </div>
                    <p className="text-xs text-muted/80">PNG, JPG, PDF up to 5MB</p>
                  </div>
                </div>
                {file && <p className="mt-2 text-sm font-medium text-foreground">Selected: {file.name}</p>}
              </div>

              {error && <p className="mb-4 text-sm text-error">{error}</p>}

              <Button
                type="submit"
                disabled={isUploading || !file}
                isLoading={isUploading}
                className="w-full"
              >
                Submit ID for Verification
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
