'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { request } from '@/lib/api';
import { motion } from 'framer-motion';

const CATEGORIES = ['camera', 'drone', 'projector', 'console', 'laptop', 'audio', 'other'];

export default function EditListingPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const { user, accessToken, isLoading: authLoading } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'camera',
    pricePerDay: '',
    weeklyDiscount: '',
    depositAmount: '',
    location: '',
    latitude: 0,
    longitude: 0,
    availabilityStart: '',
    availabilityEnd: '',
    images: [] as string[],
    blockedDates: [] as string[],
  });

  // Fetch existing listing
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirect=/listings/${id}/edit`);
      return;
    }

    const fetchListing = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/listings/${id}`);
        if (!res.ok) throw new Error('Listing not found');
        const data = await res.json();
        
        if (data.listing.owner.id !== user.id) {
          router.push('/dashboard');
          return;
        }

        const l = data.listing;
        setFormData({
          title: l.title || '',
          description: l.description || '',
          category: l.category || 'camera',
          pricePerDay: l.pricePerDay ? l.pricePerDay.toString() : '',
          weeklyDiscount: l.weeklyDiscount ? l.weeklyDiscount.toString() : '',
          depositAmount: l.depositAmount ? l.depositAmount.toString() : '',
          location: l.location || '',
          latitude: l.latitude || 0,
          longitude: l.longitude || 0,
          // Convert from ISO string back to yyyy-MM-dd for HTML date inputs
          availabilityStart: l.availabilityStart ? l.availabilityStart.split('T')[0] : '',
          availabilityEnd: l.availabilityEnd ? l.availabilityEnd.split('T')[0] : '',
          images: l.images || [],
          blockedDates: l.blockedDates || [],
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchListing();
  }, [id, user, authLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (index: number, val: string) => {
    const newImages = [...formData.images];
    newImages[index] = val;
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const addImage = () => {
    if (formData.images.length < 6) {
      setFormData(prev => ({ ...prev, images: [...prev.images, ''] }));
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !accessToken) return;
    
    setIsSaving(true);
    setError('');

    try {
      const payload = {
        ...formData,
        pricePerDay: parseFloat(formData.pricePerDay),
        weeklyDiscount: formData.weeklyDiscount ? parseFloat(formData.weeklyDiscount) : null,
        depositAmount: parseFloat(formData.depositAmount),
        // Convert yyyy-MM-dd back to ISO string for backend Zod validation
        availabilityStart: new Date(formData.availabilityStart).toISOString(),
        availabilityEnd: new Date(formData.availabilityEnd).toISOString(),
        // Just filtering empty string images
        images: formData.images.filter(img => img.trim() !== ''),
      };

      if (payload.images.length === 0) {
        throw new Error('Please provide at least 1 image.');
      }

      await request(`/api/listings/${id}`, {
        method: 'PUT',
        token: accessToken,
        body: JSON.stringify(payload),
      });

      // Redirect back to dashboard gear tab
      router.push('/dashboard?tab=gear');
    } catch (err: any) {
      if (err.errors && Array.isArray(err.errors)) {
        setError(err.errors.map((e: any) => e.message).join(' | '));
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-black" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-69px)] bg-[#F7F8FA] pb-24 pt-8 sm:pt-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <button onClick={() => router.back()} className="mb-6 flex items-center text-sm font-semibold text-gray-500 hover:text-black">
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="font-heading text-3xl font-extrabold text-black">Edit Listing</h1>
        </motion.div>

        {error && (
          <div className="mb-8 rounded-2xl bg-error/10 p-4 text-sm font-medium text-error border border-error/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Basic Info */}
          <section className="rounded-[1.5rem] bg-white p-6 sm:p-8 shadow-sm border border-gray-100">
            <h2 className="font-heading text-xl font-bold mb-6">Basic Info</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2">Title</label>
                <input required name="title" value={formData.title} onChange={handleChange} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-black focus:ring-1 focus:ring-black" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Description</label>
                <textarea required name="description" value={formData.description} onChange={handleChange} rows={5} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-black focus:ring-1 focus:ring-black" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Category</label>
                <select name="category" value={formData.category} onChange={handleChange} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-black focus:ring-1 focus:ring-black">
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Pricing & Location */}
          <section className="rounded-[1.5rem] bg-white p-6 sm:p-8 shadow-sm border border-gray-100">
            <h2 className="font-heading text-xl font-bold mb-6">Pricing & Location</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold mb-2">Price per day ($)</label>
                <input required type="number" step="0.01" name="pricePerDay" value={formData.pricePerDay} onChange={handleChange} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-black focus:ring-1 focus:ring-black" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Deposit Amount ($)</label>
                <input required type="number" step="0.01" name="depositAmount" value={formData.depositAmount} onChange={handleChange} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-black focus:ring-1 focus:ring-black" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Weekly Discount (%)</label>
                <input type="number" name="weeklyDiscount" value={formData.weeklyDiscount} onChange={handleChange} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-black focus:ring-1 focus:ring-black" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Location (City, State)</label>
                <input required name="location" value={formData.location} onChange={handleChange} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-black focus:ring-1 focus:ring-black" />
              </div>
            </div>
          </section>

          {/* Availability */}
          <section className="rounded-[1.5rem] bg-white p-6 sm:p-8 shadow-sm border border-gray-100">
            <h2 className="font-heading text-xl font-bold mb-6">Availability Dates</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold mb-2">Available From</label>
                <input required type="date" name="availabilityStart" value={formData.availabilityStart} onChange={handleChange} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-black focus:ring-1 focus:ring-black" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Available Until</label>
                <input required type="date" name="availabilityEnd" value={formData.availabilityEnd} onChange={handleChange} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-black focus:ring-1 focus:ring-black" />
              </div>
            </div>
          </section>

          {/* Images */}
          <section className="rounded-[1.5rem] bg-white p-6 sm:p-8 shadow-sm border border-gray-100">
            <h2 className="font-heading text-xl font-bold mb-6">Images</h2>
            <div className="space-y-4">
              {formData.images.map((url, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <input required type="url" value={url} onChange={(e) => handleImageChange(i, e.target.value)} placeholder="Image URL" className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-black focus:ring-1 focus:ring-black" />
                  <button type="button" onClick={() => removeImage(i)} className="text-error hover:text-red-700 p-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
              {formData.images.length < 6 && (
                <button type="button" onClick={addImage} className="text-sm font-bold text-black border border-black rounded-xl px-4 py-2 hover:bg-gray-50">
                  + Add Image URL
                </button>
              )}
            </div>
          </section>

          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={() => router.back()} className="rounded-full px-8 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="rounded-full bg-black px-10 py-3 text-sm font-bold text-white shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
