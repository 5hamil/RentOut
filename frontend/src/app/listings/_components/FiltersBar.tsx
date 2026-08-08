'use client';

import { useState, useEffect, useRef } from 'react';
import { useDebounce } from 'use-debounce';
import { motion } from 'framer-motion';
import { Search, MapPin, Map, Grid, X, IndianRupee } from 'lucide-react';

export interface FilterState {
  q: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  lat: string;
  lng: string;
  radius: string;
  locationName: string;
  startDate: string;
  endDate: string;
}

interface FiltersBarProps {
  filters: FilterState;
  onChange: (updates: Partial<FilterState>) => void;
  viewMode: 'grid' | 'map';
  setViewMode: (mode: 'grid' | 'map') => void;
  itemCount: number;
  isLoading: boolean;
}

export default function FiltersBar({ filters, onChange, viewMode, setViewMode, itemCount, isLoading }: FiltersBarProps) {
  const [localQ, setLocalQ] = useState(filters.q);
  const [debouncedQ] = useDebounce(localQ, 500);

  // Sync debounced search term up
  useEffect(() => {
    if (debouncedQ !== filters.q) {
      onChange({ q: debouncedQ });
    }
  }, [debouncedQ, filters.q, onChange]);

  // Location Autocomplete
  const [locInput, setLocInput] = useState(filters.locationName);
  const [debouncedLoc] = useDebounce(locInput, 600);
  const [locResults, setLocResults] = useState<any[]>([]);
  const [showLocMenu, setShowLocMenu] = useState(false);
  const locRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function searchLoc() {
      if (!debouncedLoc || debouncedLoc === filters.locationName) {
        setLocResults([]);
        return;
      }
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedLoc)}&limit=5`);
        const data = await res.json();
        setLocResults(data);
        setShowLocMenu(true);
      } catch (err) {
        // ignore
      }
    }
    searchLoc();
  }, [debouncedLoc, filters.locationName]);

  // Click outside to close location menu
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (locRef.current && !locRef.current.contains(e.target as Node)) {
        setShowLocMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelectLocation = (result: any) => {
    setLocInput(result.display_name);
    setShowLocMenu(false);
    onChange({
      lat: result.lat,
      lng: result.lon,
      locationName: result.display_name
    });
  };

  const clearLocation = () => {
    setLocInput('');
    onChange({ lat: '', lng: '', locationName: '' });
  };

  return (
    <div className="sticky top-0 z-40 border-b border-gray-100 bg-white px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        
        {/* Left: Filters */}
        <div className="flex flex-1 items-center gap-3 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
          
          {/* Search */}
          <div className="relative flex-shrink-0 w-48 sm:w-64">
            <Search strokeWidth={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search gear..."
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition-all placeholder:text-gray-400 font-medium"
            />
          </div>

          {/* Location */}
          <div className="relative flex-shrink-0 w-48 sm:w-64" ref={locRef}>
            <MapPin strokeWidth={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Where?"
              value={locInput}
              onChange={(e) => {
                setLocInput(e.target.value);
                if (e.target.value === '') clearLocation();
              }}
              onFocus={() => {
                if (locResults.length > 0) setShowLocMenu(true);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-8 py-2.5 text-sm text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition-all placeholder:text-gray-400 font-medium"
            />
            {locInput && (
              <button onClick={clearLocation} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors">
                <X strokeWidth={2} className="h-4 w-4" />
              </button>
            )}

            {/* Autocomplete Menu */}
            {showLocMenu && locResults.length > 0 && (
              <div className="absolute left-0 mt-2 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl shadow-black/5 z-50">
                {locResults.map((res) => (
                  <button
                    key={res.place_id}
                    onClick={() => handleSelectLocation(res)}
                    className="w-full border-b border-gray-50 px-4 py-3 text-left text-sm last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <p className="truncate text-black font-semibold">{res.display_name.split(',')[0]}</p>
                    <p className="truncate text-xs text-gray-500 mt-0.5 font-medium">{res.display_name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category */}
          <select
            value={filters.category}
            onChange={(e) => onChange({ category: e.target.value })}
            className="flex-shrink-0 appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-8 text-sm text-black font-medium focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition-all cursor-pointer"
            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23000' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
          >
            <option value="">All Gear</option>
            <option value="camera">Cameras</option>
            <option value="lens">Lenses</option>
            <option value="drone">Drones</option>
            <option value="lighting">Lighting</option>
            <option value="audio">Audio</option>
            <option value="stabilizer">Stabilizers</option>
            <option value="projector">Projectors</option>
            <option value="accessory">Accessories</option>
          </select>
          
          {/* Price Range */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <IndianRupee strokeWidth={1.5} className="h-4 w-4 text-gray-400" />
            <input
              type="number"
              placeholder="Min"
              value={filters.minPrice}
              onChange={(e) => onChange({ minPrice: e.target.value })}
              className="w-20 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-center text-black font-medium focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition-all placeholder:text-gray-400"
            />
            <span className="text-gray-300">-</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={(e) => onChange({ maxPrice: e.target.value })}
              className="w-20 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-center text-black font-medium focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Right: Info & View Toggle (Visible mostly on desktop or wraps on mobile) */}
        <div className="flex items-center justify-between lg:justify-end gap-6 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
          <p className="text-sm font-semibold text-gray-500 whitespace-nowrap">
            {isLoading ? 'Searching...' : `${itemCount} items found`}
          </p>
          
          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'grid' 
                  ? 'bg-white text-black shadow-sm ring-1 ring-gray-200' 
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              <Grid strokeWidth={2} className="h-3.5 w-3.5" />
              Grid
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'map' 
                  ? 'bg-white text-black shadow-sm ring-1 ring-gray-200' 
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              <Map strokeWidth={2} className="h-3.5 w-3.5" />
              Map
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
