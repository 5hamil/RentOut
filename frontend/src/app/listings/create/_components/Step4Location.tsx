'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { ListingDraft } from '@/types/listing';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// ─── Dynamic import of Leaflet map (SSR disabled) ─────────────────────────────
const MapPicker = dynamic(() => import('./MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-xl bg-gray-100">
      <div className="flex flex-col items-center gap-2 text-muted">
        <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
        </svg>
        <span className="text-sm">Loading map…</span>
      </div>
    </div>
  ),
});

// ─── Nominatim geocoding ──────────────────────────────────────────────────────

interface GeoResult {
  lat: number;
  lng: number;
  displayName: string;
}

async function geocode(address: string): Promise<GeoResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  const data = await res.json();
  if (!data.length) return null;
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  draft: ListingDraft;
  onChange: (u: Partial<ListingDraft>) => void;
  onNext: () => void;
  onPrev: () => void;
}

// ─── Step 4 ───────────────────────────────────────────────────────────────────

export default function Step4Location({ draft, onChange, onNext, onPrev }: Props) {
  const [addressInput, setAddressInput] = useState(draft.location);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [fieldError, setFieldError] = useState('');

  const handleSearch = async () => {
    if (!addressInput.trim()) {
      setGeocodeError('Please enter an address to search.');
      return;
    }
    setIsGeocoding(true);
    setGeocodeError('');
    try {
      const result = await geocode(addressInput.trim());
      if (!result) {
        setGeocodeError('Address not found. Try a more specific query.');
        return;
      }
      onChange({ location: result.displayName, latitude: result.lat, longitude: result.lng });
      setAddressInput(result.displayName);
      setFlyTarget({ lat: result.lat, lng: result.lng });
    } catch {
      setGeocodeError('Geocoding failed. Please try again.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleMapLocationChange = (lat: number, lng: number) => {
    onChange({ latitude: lat, longitude: lng });
  };

  const handleNext = () => {
    if (!draft.location.trim() || draft.latitude === null || draft.longitude === null) {
      setFieldError('Please search for and confirm a location before continuing.');
      return;
    }
    onNext();
  };

  return (
    <div className="flex flex-col h-full py-2">
      <div className="mb-12">
        <h2 className="text-3xl font-heading font-extrabold text-foreground tracking-tight">Where is your item located?</h2>
        <p className="mt-2 text-lg text-muted">
          Helps renters find your listing. Only the general area is shown publicly — your exact address stays private.
        </p>
      </div>

      {/* Address search */}
      <div className="mb-8">
        <label className="mb-4 block text-sm font-semibold text-foreground uppercase tracking-wider text-muted">Address or area</label>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            value={addressInput}
            onChange={(e) => {
              setAddressInput(e.target.value);
              setGeocodeError('');
              setFieldError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. Koramangala, Bengaluru"
            className="flex-1 rounded-2xl border border-gray-200 px-6 py-4 text-base text-foreground shadow-sm outline-none transition-all placeholder:text-muted/60 focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
          <Button
            type="button"
            onClick={handleSearch}
            disabled={isGeocoding}
            size="lg"
            className="inline-flex items-center justify-center gap-2 px-8 rounded-2xl font-bold shadow-sm"
          >
            {isGeocoding ? (
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            )}
            Search
          </Button>
        </div>
        {geocodeError && <p className="mt-3 text-sm font-medium text-error">{geocodeError}</p>}
        {fieldError && <p className="mt-3 text-sm font-medium text-error">{fieldError}</p>}
        <p className="mt-3 text-sm text-muted">Press Enter or click Search. Then drag the pin to fine-tune the position.</p>
      </div>

      {/* Coordinates display */}
      {draft.latitude !== null && draft.longitude !== null && (
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-primary">{draft.location}</p>
            <p className="mt-1 text-xs font-medium text-muted/80">
              {draft.latitude.toFixed(5)}°, {draft.longitude.toFixed(5)}°
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange({ location: '', latitude: null, longitude: null });
              setAddressInput('');
              setFlyTarget(null);
            }}
            className="shrink-0 p-2 text-muted hover:text-error hover:bg-error/10 rounded-full transition-colors"
            title="Clear location"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Map */}
      <div className="h-[350px] w-full overflow-hidden rounded-3xl border border-gray-200 shadow-sm relative z-0">
        <MapPicker
          latitude={draft.latitude}
          longitude={draft.longitude}
          flyTarget={flyTarget}
          onLocationChange={handleMapLocationChange}
        />
      </div>
      <p className="mt-4 text-sm text-center text-muted">
        Click anywhere on the map to move the pin, or drag the pin to adjust the exact position.
      </p>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Navigation Footer */}
      <div className="flex justify-between pt-12 pb-4">
        <Button variant="outline" type="button" onClick={onPrev} size="lg" className="px-6 rounded-full text-base font-bold border-gray-200 hover:bg-gray-50 transition-all">
          Back
        </Button>
        <Button type="button" onClick={handleNext} size="lg" className="px-10 rounded-full text-base font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          Next Step
        </Button>
      </div>
    </div>
  );
}
