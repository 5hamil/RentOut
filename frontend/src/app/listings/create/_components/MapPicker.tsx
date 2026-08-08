'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L, { LeafletMouseEvent, DragEndEvent as LeafletDragEndEvent } from 'leaflet';

// ─── Fix Leaflet default marker icon (webpack/Next.js issue) ─────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function ClickHandler({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 14, { duration: 1.2 });
  }, [lat, lng, map]);
  return null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface MapPickerProps {
  latitude: number | null;
  longitude: number | null;
  flyTarget: { lat: number; lng: number } | null;
  onLocationChange: (lat: number, lng: number) => void;
}

// ─── MapPicker ────────────────────────────────────────────────────────────────

export default function MapPicker({ latitude, longitude, flyTarget, onLocationChange }: MapPickerProps) {
  const DEFAULT_CENTER: L.LatLngExpression = [20.5937, 78.9629]; // India
  const center: L.LatLngExpression =
    latitude !== null && longitude !== null ? [latitude, longitude] : DEFAULT_CENTER;
  const zoom = latitude !== null && longitude !== null ? 14 : 5;

  return (
    <MapContainer
      key={`${latitude}-${longitude}`}
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
      />

      <ClickHandler onLocationChange={onLocationChange} />

      {flyTarget && <FlyTo lat={flyTarget.lat} lng={flyTarget.lng} />}

      {latitude !== null && longitude !== null && (
        <Marker
          position={[latitude, longitude] as L.LatLngExpression}
          draggable
          eventHandlers={{
            dragend(e: LeafletDragEndEvent) {
              const pos = (e.target as L.Marker).getLatLng();
              onLocationChange(pos.lat, pos.lng);
            },
          }}
        />
      )}
    </MapContainer>
  );
}
