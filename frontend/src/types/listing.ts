// ─── Listing domain types ─────────────────────────────────────────────────────

export const LISTING_CATEGORIES = [
  'camera',
  'drone',
  'projector',
  'console',
  'laptop',
  'audio',
  'other',
] as const;

export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

export interface CloudinaryImage {
  publicId: string;
  url: string;
  width?: number;
  height?: number;
}

/** The in-progress draft kept in local state and persisted to localStorage. */
export interface ListingDraft {
  // Step 1
  category: ListingCategory | '';
  title: string;
  description: string;
  // Step 2
  images: CloudinaryImage[];
  // Step 3
  pricePerDay: string;
  weeklyDiscount: string; // percentage string, empty = none
  depositAmount: string;
  // Step 4
  location: string;
  latitude: number | null;
  longitude: number | null;
  // Step 5
  availabilityStart: string; // ISO date string "YYYY-MM-DD"
  availabilityEnd: string;
  blockedDates: string[]; // ISO date strings
}

export const EMPTY_DRAFT: ListingDraft = {
  category: '',
  title: '',
  description: '',
  images: [],
  pricePerDay: '',
  weeklyDiscount: '',
  depositAmount: '',
  location: '',
  latitude: null,
  longitude: null,
  availabilityStart: '',
  availabilityEnd: '',
  blockedDates: [],
};
