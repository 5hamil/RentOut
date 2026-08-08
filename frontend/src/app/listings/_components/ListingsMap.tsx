'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ListingCard, { ListingCardProps } from './ListingCard';

// Fix Leaflet icons
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Create a custom pulsing dot icon for the search center
const CenterIcon = L.divIcon({
  className: 'custom-center-icon',
  html: '<div class="h-4 w-4 rounded-full bg-blue-500 border-2 border-white shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Component to dynamically fit bounds
function MapBounds({ listings, centerLat, centerLng }: { listings: ListingCardProps[], centerLat: string, centerLng: string }) {
  const map = useMap();
  
  useEffect(() => {
    if (centerLat && centerLng) {
      map.flyTo([parseFloat(centerLat), parseFloat(centerLng)], 11, { duration: 1.5 });
      return;
    }

    if (listings.length > 0) {
      // @ts-expect-error type mismatches with older leaflet types, cast safely
      const bounds = L.latLngBounds(listings.map(l => [l.latitude, l.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: true });
    }
  }, [listings, centerLat, centerLng, map]);

  return null;
}

interface ListingsMapProps {
  listings: (ListingCardProps & { latitude: number; longitude: number })[];
  centerLat?: string;
  centerLng?: string;
}

export default function ListingsMap({ listings, centerLat, centerLng }: ListingsMapProps) {
  const DEFAULT_CENTER: L.LatLngExpression = [20.5937, 78.9629]; // India
  
  const hasCenter = centerLat && centerLng;
  const initialCenter = hasCenter 
    ? [parseFloat(centerLat as string), parseFloat(centerLng as string)] as L.LatLngExpression
    : DEFAULT_CENTER;

  return (
    <div className="h-full w-full bg-gray-100">
      <MapContainer
        center={initialCenter}
        zoom={hasCenter ? 11 : 5}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
        />

        {hasCenter && (
          <Marker position={initialCenter} icon={CenterIcon} zIndexOffset={1000} />
        )}

        {listings.map((listing) => (
          <Marker key={listing.id} position={[listing.latitude, listing.longitude]}>
            <Popup className="listing-popup">
              <div className="w-48 p-0">
                <ListingCard {...listing} />
              </div>
            </Popup>
          </Marker>
        ))}

        <MapBounds listings={listings} centerLat={centerLat || ''} centerLng={centerLng || ''} />
      </MapContainer>

      <style jsx global>{`
        .listing-popup .leaflet-popup-content-wrapper { padding: 0; overflow: hidden; border-radius: 1rem; }
        .listing-popup .leaflet-popup-content { margin: 0; width: 200px !important; }
        .listing-popup .leaflet-popup-content p { margin: 0 !important; }
      `}</style>
    </div>
  );
}
