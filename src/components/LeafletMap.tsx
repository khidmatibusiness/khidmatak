import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";

export interface LeafletPin {
  id: string;
  lat: number;
  lng: number;
  emoji: string;
}

function emojiIcon(emoji: string, active: boolean) {
  return L.divIcon({
    className: "khidmati-pin",
    html: `<div style="width:42px;height:42px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 6px 16px -4px rgba(0,0,0,0.25);border:2px solid ${active ? "oklch(0.62 0.14 158)" : "white"};transform:translate(-50%,-100%);">${emoji}</div>`,
    iconSize: [42, 42],
    iconAnchor: [0, 0],
  });
}

function FlyTo({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.flyTo(pos, 15, { duration: 0.8 });
  }, [pos, map]);
  return null;
}

interface Props {
  center: [number, number];
  pins: LeafletPin[];
  selectedId: string | null;
  flyTo: [number, number] | null;
  onSelect: (id: string) => void;
}

export default function LeafletMap({ center, pins, selectedId, flyTo, onSelect }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  return (
    <MapContainer
      center={center}
      zoom={14}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
      ref={(m) => { if (m) mapRef.current = m; }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyTo pos={flyTo} />
      {pins.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={emojiIcon(p.emoji, p.id === selectedId)}
          eventHandlers={{ click: () => onSelect(p.id) }}
        />
      ))}
    </MapContainer>
  );
}
