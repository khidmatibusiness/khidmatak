import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Khidmati · Map" },
      { name: "description", content: "Browse Khidmati providers on a map of West Amman." },
    ],
  }),
  component: MapPage,
});

interface PinService {
  id: string;
  name_en: string;
  category: string | null;
  price: number;
  pro_name: string;
  // Pseudo-location around West Amman
  lat: number;
  lng: number;
}

// West Amman bounding box (approx)
const CENTER = { lat: 31.9632, lng: 35.8519 };
const SPREAD = 0.04;

function seedFromId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function MapPage() {
  const [pins, setPins] = useState<PinService[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PinService | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: svc } = await supabase
        .from("services")
        .select("id, name_en, category, price, pro_id")
        .eq("is_active", true)
        .limit(40);
      const list = (svc ?? []) as Array<{ id: string; name_en: string; category: string | null; price: number; pro_id: string | null }>;
      const proIds = Array.from(new Set(list.map((s) => s.pro_id).filter(Boolean) as string[]));
      const proMap: Record<string, string> = {};
      if (proIds.length) {
        const { data: pros } = await supabase.from("users").select("id, full_name").in("id", proIds);
        for (const p of (pros ?? []) as Array<{ id: string; full_name: string | null }>) {
          if (p.full_name) proMap[p.id] = p.full_name;
        }
      }
      if (cancelled) return;
      setPins(
        list.map((s) => {
          const seed = seedFromId(s.id);
          const lat = CENTER.lat + (((seed % 1000) / 1000) - 0.5) * SPREAD;
          const lng = CENTER.lng + ((((seed >> 10) % 1000) / 1000) - 0.5) * SPREAD;
          return {
            id: s.id,
            name_en: s.name_en,
            category: s.category,
            price: Number(s.price),
            pro_name: (s.pro_id && proMap[s.pro_id]) || s.name_en,
            lat,
            lng,
          };
        }),
      );
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const bbox = [
    CENTER.lng - SPREAD,
    CENTER.lat - SPREAD,
    CENTER.lng + SPREAD,
    CENTER.lat + SPREAD,
  ].join(",");
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${CENTER.lat},${CENTER.lng}`;

  return (
    <div className="relative min-h-screen pb-32">
      <div className="absolute inset-0 -z-0">
        <iframe
          title="West Amman map"
          src={mapSrc}
          className="w-full h-[60vh] border-0"
          loading="lazy"
        />
      </div>

      <div className="relative z-10 px-5 pt-7 flex items-center gap-3">
        <Link
          to="/"
          aria-label="Back"
          className="spring-tap glass-strong w-11 h-11 rounded-full flex items-center justify-center"
        >
          <ArrowLeft size={18} className="rtl:rotate-180" />
        </Link>
        <div className="glass-strong rounded-full px-4 py-2 text-sm font-semibold flex items-center gap-1.5">
          <MapPin size={14} className="text-primary" /> West Amman
        </div>
      </div>

      {/* Pseudo-pin dots overlaid in scrollable list below */}
      <div className="relative z-10 mt-[55vh]">
        <div className="bg-background rounded-t-3xl pt-5 px-5 pb-8 -mx-0 shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.15)]">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-muted mb-4" />
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">{pins.length} providers nearby</h2>
          </div>

          {loading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2">
              {pins.map((p) => {
                const distKm = haversine(CENTER, p).toFixed(1);
                return (
                  <Link
                    key={p.id}
                    to="/pro/$id"
                    params={{ id: p.id }}
                    onMouseEnter={() => setSelected(p)}
                    className="spring-tap glass rounded-2xl p-3 flex items-center gap-3"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      📍
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{p.pro_name}</div>
                      <div className="text-[11px] text-muted-foreground capitalize">
                        {p.category ?? "Service"} · {distKm} km
                      </div>
                    </div>
                    <div className="text-sm font-bold text-primary shrink-0">{p.price.toFixed(0)} JOD</div>
                  </Link>
                );
              })}
              {pins.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No providers found.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selected && null}
    </div>
  );
}

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
