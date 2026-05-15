import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { X, MapPin, Loader2, Navigation, Star, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const LeafletMap = lazy(() => import("@/components/LeafletMap"));

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectService?: (serviceId: string) => void;
}

interface PinService {
  id: string;
  name_en: string;
  category: string | null;
  subcategory: string | null;
  price: number;
  pro_name: string;
  lat: number;
  lng: number;
  emoji: string;
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

function seedFromId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function MapSheet({ open, onClose, onSelectService }: Props) {
  const [pins, setPins] = useState<PinService[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [meTo, setMeTo] = useState<[number, number] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    (async () => {
      const { data: svc } = await supabase
        .from("services")
        .select("id, name_en, category, subcategory, price, pro_id")
        .eq("is_active", true)
        .limit(40);
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
          return {
            id: s.id,
            name_en: s.name_en,
            category: s.category,
            subcategory: s.subcategory,
            price: Number(s.price),
            pro_name: (s.pro_id && proMap[s.pro_id]) || s.name_en,
            lat,
            lng,
            emoji,
          };
        }),
      );
      setLoading(false);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [open, loaded]);

  const selected = useMemo(() => pins.find((p) => p.id === selectedId) ?? pins[0] ?? null, [pins, selectedId]);
  const distance = selected ? haversine({ lat: CENTER[0], lng: CENTER[1] }, selected) : 0;

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fade-up"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md h-[92dvh] rounded-t-[28px] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: "var(--shadow-float)" }}
      >
        <div className="absolute top-0 inset-x-0 z-20 px-4 pt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              aria-label="Close"
              className="spring-tap glass-strong w-10 h-10 rounded-full flex items-center justify-center"
            >
              <X size={18} />
            </button>
            <div className="glass-strong rounded-full px-3.5 py-2 text-sm font-bold flex items-center gap-1.5">
              <MapPin size={14} className="text-primary" /> Providers map
            </div>
          </div>
          <button
            onClick={locateMe}
            className="spring-tap glass-strong rounded-full px-3.5 py-2 text-sm font-semibold flex items-center gap-1.5"
          >
            <Navigation size={14} className="text-primary" /> Locate me
          </button>
        </div>

        <div className="h-full w-full bg-muted">
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
                onSelect={(id) => {
                  setSelectedId(id);
                  if (onSelectService) onSelectService(id);
                }}
              />
            </Suspense>
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <Loader2 className="animate-spin text-primary" />
            </div>
          )}
        </div>

        {selected && (
          <div className="absolute left-0 right-0 bottom-0 z-20 px-4 pb-5">
            <button
              type="button"
              onClick={() => onSelectService?.(selected.id)}
              className="spring-tap block w-full text-start bg-white rounded-3xl p-4 border border-border animate-fade-up"
              style={{ boxShadow: "var(--shadow-float)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                  style={{ background: "var(--color-primary-tint)" }}
                >
                  {selected.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="font-bold truncate">{selected.pro_name}</div>
                    <ShieldCheck size={14} className="text-primary shrink-0" />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <Star size={11} className="fill-gold text-gold" />
                    <span className="text-foreground font-semibold">4.8</span>
                    <span>·</span>
                    <Navigation size={11} />
                    <span>{distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}</span>
                    <span>· {Math.max(2, Math.round(distance * 4))} min</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-primary">{selected.price.toFixed(0)} JOD</div>
                  <div className="text-[11px] mt-1 px-3 py-1 rounded-full text-white" style={{ background: "var(--gradient-primary)" }}>
                    View
                  </div>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>
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
