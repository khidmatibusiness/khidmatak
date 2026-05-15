import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

export interface LeafletPin {
  id: string;
  lat: number;
  lng: number;
  emoji: string;
  name: string;
  rating: number;
  distanceKm: number;
  etaMin: number;
  price: number;
  unit?: string;
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
  onBook: (id: string) => void;
}

export default function LeafletMap({ center, pins, selectedId, flyTo, onSelect, onBook }: Props) {
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
      {pins.map((p) => {
        const dist = p.distanceKm < 1 ? `${Math.round(p.distanceKm * 1000)} m` : `${p.distanceKm.toFixed(1)} km`;
        return (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={emojiIcon(p.emoji, p.id === selectedId)}
            eventHandlers={{ click: () => onSelect(p.id) }}
          >
            <Popup closeButton autoPan minWidth={210} className="khidmati-popup">
              <div style={{ fontFamily: "inherit" }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#0a0a0a", lineHeight: 1.2 }}>{p.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#666", marginTop: 4 }}>
                  <span style={{ color: "#e2b300" }}>★</span>
                  <span style={{ fontWeight: 600, color: "#0a0a0a" }}>{p.rating.toFixed(1)}</span>
                  <span>·</span>
                  <span>{dist}</span>
                  <span>·</span>
                  <span>{p.etaMin} min</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "oklch(0.55 0.14 158)", marginTop: 6 }}>
                  {p.price.toFixed(0)} JOD{p.unit ?? "/hr"}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onBook(p.id); }}
                    style={{
                      flex: 1,
                      background: "oklch(0.55 0.14 158)",
                      color: "white",
                      border: "none",
                      borderRadius: 999,
                      padding: "8px 14px",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Book
                  </button>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      flex: 1,
                      background: "white",
                      color: "#0a0a0a",
                      border: "1.5px solid #0a0a0a",
                      borderRadius: 999,
                      padding: "7px 14px",
                      fontWeight: 600,
                      fontSize: 13,
                      textAlign: "center",
                      textDecoration: "none",
                    }}
                  >
                    Directions
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
