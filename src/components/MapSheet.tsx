import { lazy, Suspense, useEffect, useState } from "react";
import { X, MapPin, Loader2, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { LeafletPin } from "@/components/LeafletMap";

const LeafletMap = lazy(() => import("@/components/LeafletMap"));

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectService?: (serviceId: string) => void;
  filterCategory?: string;
}

const CENTER: [number, number] = [31.9632, 35.8519];
const SPREAD = 0.025;

const SUBCAT_EMOJI: Record<string, string> = {
  cleaning: "🧼", laundry: "🧺", pest: "🪲", painting: "🎨",
  padel: "🎾", football: "⚽", gym: "🏋️", swim: "🏊", tennis: "🎾", basketball: "🏀",
  dentist: "🦷", optician: "👓", lab: "🧪",
  barber: "💈", salon: "💇", hammam: "🛁", spa: "💆",
};
const CAT_EMOJI: Record<string, string> = {
  home: "🏠", sports: "🎾", medical: "🩺", beauty: "💆",
};

const SUBCAT_UNIT: Record<string, string> = {
  cleaning: "/hr", laundry: "/kg", pest: "/visit", painting: "/room",
  padel: "/90 min", football: "/hr", gym: "/visit", swim: "/visit", tennis: "/hr",
  dentist: "/visit", optician: "/visit", lab: "/test",
  barber: "/visit", salon: "/visit", hammam: "/visit", spa: "/visit",
};

function seedFromId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
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

export function MapSheet({ open, onClose, onSelectService, filterCategory }: Props) {
  const [pins, setPins] = useState<LeafletPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [meTo, setMeTo] = useState<[number, number] | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);

  useEffect(() => {
    const key = filterCategory ?? "__all";
    if (!open || loaded === key) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      let q = supabase
        .from("services")
        .select("id, name_en, category, subcategory, price, pro_id")
        .eq("is_active", true)
        .limit(80);
      if (filterCategory) q = q.eq("category", filterCategory);
      const { data: svc } = await q;
      const list = (svc ?? []) as Array<{ id: string; name_en: string; category: string | null; subcategory: string | null; price: number; pro_id: string | null }>;
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
          const lat = CENTER[0] + (((seed % 1000) / 1000) - 0.5) * SPREAD;
          const lng = CENTER[1] + ((((seed >> 10) % 1000) / 1000) - 0.5) * SPREAD;
          const emoji = (s.subcategory && SUBCAT_EMOJI[s.subcategory]) || (s.category && CAT_EMOJI[s.category]) || "✨";
          const unit = (s.subcategory && SUBCAT_UNIT[s.subcategory]) || "/hr";
          const distanceKm = haversine({ lat: CENTER[0], lng: CENTER[1] }, { lat, lng });
          const rating = 4.4 + ((seed >> 5) % 60) / 100;
          return {
            id: s.id,
            lat, lng, emoji, unit,
            name: (s.pro_id && proMap[s.pro_id]) || s.name_en,
            price: Number(s.price),
            distanceKm,
            etaMin: Math.max(2, Math.round(distanceKm * 4)),
            rating,
          };
        }),
      );
      setLoading(false);
      setLoaded(key);
    })();
    return () => { cancelled = true; };
  }, [open, loaded, filterCategory]);

  const locateMe = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setMeTo(CENTER);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setMeTo([pos.coords.latitude, pos.coords.longitude]),
      () => setMeTo(CENTER),
      { timeout: 4000 },
    );
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate-fade-up"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md h-[78dvh] rounded-t-[32px] relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: "var(--shadow-float)" }}
      >
        {/* grabber */}
        <div className="pt-2.5 pb-1 flex justify-center">
          <div className="w-10 h-1.5 rounded-full bg-muted-foreground/25" />
        </div>

        {/* header */}
        <div className="px-4 pt-2 pb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin size={16} className="text-primary" />
            </div>
            <div>
              <div className="text-[15px] font-bold leading-tight">Providers near you</div>
              <div className="text-[11px] text-muted-foreground">
                {pins.length} {pins.length === 1 ? "result" : "results"}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="spring-tap w-9 h-9 rounded-full bg-muted flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>

        {/* map card */}
        <div className="flex-1 px-3 pb-3 min-h-0">
          <div
            className="relative h-full w-full rounded-[24px] overflow-hidden bg-muted border border-border"
            style={{ boxShadow: "var(--shadow-elegant)" }}
          >
            <button
              onClick={locateMe}
              className="spring-tap absolute top-3 right-3 z-[1000] glass-strong rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5"
            >
              <Navigation size={12} className="text-primary" /> Locate me
            </button>

            {!loading ? (
              <Suspense
                fallback={
                  <div className="h-full w-full flex items-center justify-center">
                    <Loader2 className="animate-spin text-primary" />
                  </div>
                }
              >
                <LeafletMap
                  center={CENTER}
                  pins={pins}
                  selectedId={selectedId}
                  flyTo={meTo}
                  onSelect={(id) => setSelectedId(id)}
                  onBook={(id) => onSelectService?.(id)}
                />
              </Suspense>
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
