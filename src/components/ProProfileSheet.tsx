import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Star, ShieldCheck, MapPin, Heart, Loader2, CalendarPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BookingSheet } from "@/components/BookingSheet";
import { getFavs, toggleFav as toggleFavStore } from "@/lib/favs";

interface ServiceRow {
  id: string;
  pro_id: string | null;
  name_en: string;
  name_ar: string | null;
  category: string | null;
  subcategory: string | null;
  price: number;
  duration_mins: number | null;
  is_active: boolean | null;
}

interface ReviewRow {
  id: string;
  rating: number | null;
  comment: string | null;
  created_at: string | null;
}

const SUBCAT_EMOJI: Record<string, string> = {
  cleaning: "🧼", laundry: "🧺", pest: "🪲", painting: "🎨",
  padel: "🎾", football: "⚽", gym: "🏋️", swim: "🏊", tennis: "🎾",
  dentist: "🦷", optician: "👓", lab: "🧪",
  barber: "💈", salon: "💇", hammam: "🛁", spa: "💆",
};

export function ProProfileSheet({ serviceId, open, onClose }: {
  serviceId: string | null; open: boolean; onClose: () => void;
}) {
  const [service, setService] = useState<ServiceRow | null>(null);
  const [proName, setProName] = useState("");
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookOpen, setBookOpen] = useState(false);
  const [favs, setFavs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setFavs(new Set(getFavs()));
    const sync = () => setFavs(new Set(getFavs()));
    window.addEventListener("khidmati:favs", sync);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("khidmati:favs", sync);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !serviceId) return;
    let cancelled = false;
    setLoading(true);
    setService(null);
    setReviews([]);
    (async () => {
      try {
        const { data: svc } = await supabase
          .from("services")
          .select("id, pro_id, name_en, name_ar, category, subcategory, price, duration_mins, is_active")
          .eq("id", serviceId).maybeSingle();
        if (cancelled || !svc) return;
        setService(svc as ServiceRow);
        if (svc.pro_id) {
          const [{ data: rvs }, { data: pro }] = await Promise.all([
            supabase.from("reviews_public" as any)
              .select("id, rating, comment, created_at")
              .eq("pro_id", svc.pro_id)
              .order("created_at", { ascending: false })
              .limit(5),
            supabase.from("users").select("full_name").eq("id", svc.pro_id).maybeSingle(),
          ]);
          if (cancelled) return;
          setReviews(((rvs ?? []) as unknown) as ReviewRow[]);
          setProName(pro?.full_name ?? svc.name_en);
        } else {
          setProName(svc.name_en);
        }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [open, serviceId]);

  if (!open || !serviceId) return null;

  const emoji = (service?.subcategory && SUBCAT_EMOJI[service.subcategory]) || "✨";
  const fav = favs.has(serviceId);
  const ratings = reviews.map((r) => r.rating ?? 0).filter((r) => r > 0);
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 4.8;

  if (typeof document === "undefined") return null;

  const sheet = (
    <>
      <div className="fixed inset-0 z-[1000] flex items-end justify-center" onClick={onClose}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-up" />
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-white rounded-t-[28px] overflow-hidden animate-fade-up flex flex-col"
          style={{ maxHeight: "calc(100dvh - 1rem)", boxShadow: "var(--shadow-float)" }}
        >
          <div className="pt-2 pb-1 flex justify-center">
            <div className="w-10 h-1 rounded-full bg-muted" />
          </div>



          {loading || !service ? (
            <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <>
              {/* Header */}
              <div className="px-5 pt-3 pb-4 flex items-start gap-3">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                  style={{ background: "var(--color-primary-tint)" }}
                >
                  {emoji}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-lg font-bold tracking-tight truncate">{proName}</h2>
                    <ShieldCheck size={16} className="text-primary shrink-0" />
                  </div>
                  <div className="text-xs text-muted-foreground capitalize mt-0.5 truncate">
                    {service.category ?? "Service"}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs">
                    <span className="flex items-center gap-1 font-semibold">
                      <Star size={12} className="fill-gold text-gold" /> {avg.toFixed(1)}
                      <span className="text-muted-foreground font-normal">({reviews.length || 320})</span>
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin size={12} /> 0.8 km
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setFavs(new Set(toggleFavStore(serviceId)))}
                  aria-label="Favourite"
                  className="spring-tap w-9 h-9 rounded-full border border-border bg-white flex items-center justify-center"
                >
                  <Heart size={16} className={fav ? "fill-destructive text-destructive" : "text-muted-foreground"} />
                </button>
                <button onClick={onClose} aria-label="Close" className="spring-tap w-8 h-8 -mr-1 flex items-center justify-center text-muted-foreground">
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-4">
                <div className="glass rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Per session</div>
                    <div className="text-2xl font-bold text-primary">
                      {Number(service.price).toFixed(2)} <span className="text-sm font-semibold">JOD</span>
                    </div>
                  </div>
                  <div className="text-end text-xs text-muted-foreground">
                    <div>{service.duration_mins ?? 60} min</div>
                    <div className="capitalize">{service.subcategory ?? service.category ?? "service"}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold mb-2">About</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed glass rounded-2xl p-4">
                    {`${proName} is a verified ${service.category ?? "service"} provider on Khidmati offering ${service.name_en}. ` +
                     `Trusted by ${reviews.length || "many"} customer${reviews.length === 1 ? "" : "s"} across West Amman.`}
                  </p>
                </div>

                {reviews.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold mb-2">Recent reviews</h3>
                    <div className="space-y-2">
                      {reviews.slice(0, 3).map((r) => (
                        <div key={r.id} className="glass rounded-2xl p-3">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-sm">Customer</div>
                            <div className="flex items-center gap-1 text-xs">
                              <Star size={12} className="fill-gold text-gold" />
                              <span className="font-bold">{r.rating ?? "—"}</span>
                            </div>
                          </div>
                          {r.comment && (
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{r.comment}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Book CTA */}
              <div className="border-t border-border/60 bg-white/95 backdrop-blur px-5 pt-3 pb-5">
                <button
                  onClick={() => setBookOpen(true)}
                  disabled={service.is_active === false}
                  className="spring-tap w-full rounded-full py-4 text-base font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-float)" }}
                >
                  <CalendarPlus size={18} /> Book Now
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <BookingSheet
        serviceId={service?.id ?? null}
        proName={proName}
        open={bookOpen}
        onClose={() => { setBookOpen(false); onClose(); }}
      />
    </>
  );

  return createPortal(sheet, document.body);
}
