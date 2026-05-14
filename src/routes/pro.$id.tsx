import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft, Star, MapPin, Clock, ShieldCheck, CalendarPlus, Loader2, Circle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BookingSheet } from "@/components/BookingSheet";

export const Route = createFileRoute("/pro/$id")({
  head: ({ params }) => ({
    meta: [
      { title: "Khidmati · Pro profile" },
      { name: "description", content: `View provider profile, reviews and book on Khidmati.` },
    ],
  }),
  component: ProProfilePage,
});

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
  customer_id: string | null;
}

function ProProfilePage() {
  const { id } = useParams({ from: "/pro/$id" });
  const [service, setService] = useState<ServiceRow | null>(null);
  const [proName, setProName] = useState<string>("");
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookOpen, setBookOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: svc, error: svcErr } = await supabase
          .from("services")
          .select("id, pro_id, name_en, name_ar, category, subcategory, price, duration_mins, is_active")
          .eq("id", id)
          .maybeSingle();
        if (svcErr) throw svcErr;
        if (!svc) throw new Error("Provider not found");
        if (cancelled) return;
        setService(svc as ServiceRow);

        if (svc.pro_id) {
          const [{ data: rvs }, { data: pro }] = await Promise.all([
            supabase
              .from("reviews")
              .select("id, rating, comment, created_at, customer_id")
              .eq("pro_id", svc.pro_id)
              .order("created_at", { ascending: false }),
            supabase
              .from("users")
              .select("full_name")
              .eq("id", svc.pro_id)
              .maybeSingle(),
          ]);
          if (cancelled) return;
          setReviews((rvs ?? []) as ReviewRow[]);
          setProName(pro?.full_name ?? svc.name_en);
        } else {
          setProName(svc.name_en);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="px-5 pt-12 text-center space-y-3">
        <p className="text-muted-foreground">{error ?? "Provider not found."}</p>
        <Link to="/" className="text-primary font-medium">Back to home</Link>
      </div>
    );
  }

  const ratings = reviews.map((r) => r.rating ?? 0).filter((r) => r > 0);
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  const initial = (proName || service.name_en).trim().charAt(0).toUpperCase();
  const isAvailable = service.is_active !== false;

  const handleBook = () => {
    setBookOpen(true);
  };

  return (
    <div className="pb-32">
      {/* header bar */}
      <div className="px-5 pt-7 flex items-center justify-between">
        <Link
          to="/"
          aria-label="Back"
          className="spring-tap glass-strong w-11 h-11 rounded-full flex items-center justify-center"
        >
          <ArrowLeft size={18} className="rtl:rotate-180" />
        </Link>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{
            background: isAvailable ? "color-mix(in oklab, var(--color-primary) 12%, white)" : "color-mix(in oklab, oklch(0.65 0.18 25) 12%, white)",
            color: isAvailable ? "var(--color-primary)" : "oklch(0.55 0.18 25)",
          }}
        >
          <Circle size={8} className="fill-current" />
          {isAvailable ? "Available now" : "Unavailable"}
        </span>
      </div>

      {/* identity */}
      <div className="px-5 pt-6 flex flex-col items-center text-center">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center text-white text-4xl font-bold"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-float)" }}
        >
          {initial}
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight flex items-center gap-1.5">
          {proName}
          <ShieldCheck size={18} className="text-primary" />
        </h1>
        <div className="text-xs text-muted-foreground mt-1 capitalize">
          {service.category ?? "Service"}{service.subcategory ? ` · ${service.subcategory}` : ""}
        </div>

        {/* stats */}
        <div className="mt-4 flex items-center gap-2">
          <div className="glass rounded-2xl px-4 py-2.5 flex items-center gap-1.5">
            <Star size={14} className="fill-gold text-gold" />
            <span className="font-bold text-sm">{avg ? avg.toFixed(1) : "—"}</span>
            <span className="text-xs text-muted-foreground">({reviews.length})</span>
          </div>
          <div className="glass rounded-2xl px-4 py-2.5 flex items-center gap-1.5 text-sm">
            <Clock size={14} className="text-primary" />
            <span className="font-semibold">{service.duration_mins ?? 60} min</span>
          </div>
        </div>

        {/* price */}
        <div className="mt-4 glass-strong rounded-2xl px-5 py-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
            Per session
          </div>
          <div className="text-2xl font-bold text-primary">
            {Number(service.price).toFixed(2)} <span className="text-sm font-semibold">JOD</span>
          </div>
        </div>
      </div>

      {/* about */}
      <div className="px-5 mt-7">
        <h2 className="text-sm font-bold mb-2">About</h2>
        <p className="text-sm text-muted-foreground leading-relaxed glass rounded-2xl p-4">
          {`${proName} is a verified ${service.category ?? "service"} provider on Khidmati offering ${service.name_en}. ` +
           `Trusted by ${reviews.length} customer${reviews.length === 1 ? "" : "s"} across West Amman.`}
        </p>
      </div>

      {/* reviews */}
      <div className="px-5 mt-7">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold">Reviews</h2>
          <span className="text-xs text-muted-foreground">{reviews.length} total</span>
        </div>
        <div className="space-y-2">
          {reviews.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8 glass rounded-2xl">
              No reviews yet.
            </div>
          )}
          {reviews.map((r) => {
            const name = r.customer_id ? `Customer ${r.customer_id.slice(0, 4).toUpperCase()}` : "Customer";
            return (
              <div key={r.id} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">{name}</div>
                  <div className="flex items-center gap-1 text-xs">
                    <Star size={12} className="fill-gold text-gold" />
                    <span className="font-bold">{r.rating ?? "—"}</span>
                  </div>
                </div>
                {r.comment && (
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{r.comment}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* sticky action bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 px-5 pb-5 pt-3 pointer-events-none">
        <div className="max-w-md mx-auto flex gap-2 pointer-events-auto">
          <button
            onClick={() => toast("Opening map…")}
            className="spring-tap flex-1 rounded-2xl py-3.5 text-sm font-semibold border border-border bg-white flex items-center justify-center gap-2"
          >
            <MapPin size={16} /> View on Map
          </button>
          <button
            onClick={handleBook}
            disabled={!isAvailable}
            className="spring-tap flex-[1.4] rounded-2xl py-3.5 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-float)" }}
          >
            <CalendarPlus size={16} /> Book Now
          </button>
        </div>
      </div>
    </div>
  );
}
