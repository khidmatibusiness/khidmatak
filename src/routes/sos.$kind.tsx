import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Siren, MapPin, Star, ShieldCheck, Check, X, Loader2, Navigation } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/sos/$kind")({
  head: () => ({
    meta: [{ title: "Khidmati · SOS Emergency" }],
  }),
  component: SosResultsPage,
});

const KIND_META: Record<string, { label: string; emoji: string; sample: Array<{ name: string; rating: number; distance: number; eta: number; price: number }> }> = {
  plumber: {
    label: "Plumber",
    emoji: "🔧",
    sample: [
      { name: "Sparkle Plumbing", rating: 4.9, distance: 0.8, eta: 2, price: 11 },
      { name: "Crystal Home", rating: 4.7, distance: 1.3, eta: 3, price: 12 },
      { name: "AquaFix Pro", rating: 4.8, distance: 1.7, eta: 5, price: 13 },
    ],
  },
  electrician: {
    label: "Electrician",
    emoji: "⚡",
    sample: [
      { name: "VoltMaster", rating: 4.8, distance: 0.6, eta: 2, price: 14 },
      { name: "Amman Electric", rating: 4.6, distance: 1.4, eta: 4, price: 13 },
      { name: "Bright Spark", rating: 4.9, distance: 2.1, eta: 6, price: 15 },
    ],
  },
  locksmith: {
    label: "Locksmith",
    emoji: "🔑",
    sample: [
      { name: "Key Heroes", rating: 4.9, distance: 0.9, eta: 3, price: 18 },
      { name: "Lock & Go", rating: 4.7, distance: 1.6, eta: 5, price: 16 },
    ],
  },
  tow: {
    label: "Tow / Mechanic",
    emoji: "🚗",
    sample: [
      { name: "Amman Towing", rating: 4.7, distance: 1.2, eta: 6, price: 22 },
      { name: "RoadRescue", rating: 4.8, distance: 2.0, eta: 8, price: 25 },
    ],
  },
  ac: {
    label: "AC Repair",
    emoji: "❄️",
    sample: [
      { name: "CoolFix", rating: 4.8, distance: 1.0, eta: 4, price: 17 },
      { name: "Arctic Tech", rating: 4.6, distance: 1.9, eta: 6, price: 15 },
    ],
  },
  medical: {
    label: "Medical",
    emoji: "🚑",
    sample: [
      { name: "Med Rapid", rating: 4.9, distance: 0.7, eta: 2, price: 28 },
      { name: "FirstAid Now", rating: 4.8, distance: 1.5, eta: 5, price: 24 },
    ],
  },
};

const URGENCY_FEE = 5;

function SosResultsPage() {
  const { kind } = Route.useParams();
  const navigate = useNavigate();
  const meta = KIND_META[kind] ?? KIND_META.plumber;
  const [revealedIdx, setRevealedIdx] = useState(0);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const offers = useMemo(() => meta.sample.map((s) => ({ ...s, total: s.price + URGENCY_FEE })), [meta]);

  // Stagger offers in to feel like real-time responses
  useEffect(() => {
    if (revealedIdx >= offers.length) return;
    const t = setTimeout(() => setRevealedIdx((i) => Math.min(i + 1, offers.length)), 900);
    return () => clearTimeout(t);
  }, [revealedIdx, offers.length]);

  const visible = offers.slice(0, revealedIdx);

  return (
    <div className="min-h-screen pb-32 bg-background">
      {/* Red header */}
      <div
        className="px-5 pt-7 pb-6 text-white relative"
        style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 22), oklch(0.55 0.24 18))" }}
      >
        <div className="flex items-start justify-between gap-3">
          <Link
            to="/"
            aria-label="Back"
            className="spring-tap glass-strong w-10 h-10 rounded-full flex items-center justify-center text-foreground"
          >
            <ArrowLeft size={18} className="rtl:rotate-180" />
          </Link>
          <button
            onClick={() => { toast("Emergency cancelled"); navigate({ to: "/" }); }}
            className="text-white/80 hover:text-white p-2"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center">
            <Siren size={22} />
          </div>
          <div>
            <div className="font-bold text-xl tracking-tight">
              {meta.label} · SOS Emergency
            </div>
            <div className="text-sm text-white/80">
              {revealedIdx < offers.length ? "Searching nearby providers…" : `${offers.length} offers received`}
            </div>
          </div>
        </div>
      </div>

      {/* Offers */}
      <div className="px-5 pt-5 space-y-3">
        {revealedIdx === 0 && (
          <div className="py-10 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="animate-spin text-destructive" size={28} />
            <div className="text-sm">Broadcasting to nearby verified providers…</div>
          </div>
        )}

        {visible.map((o, i) => {
          const isConfirmed = confirmed === o.name;
          const isDimmed = confirmed && !isConfirmed;
          return (
            <div
              key={o.name}
              className={`rounded-3xl bg-white border border-border p-4 animate-fade-up transition-opacity ${isDimmed ? "opacity-40" : ""}`}
              style={{ boxShadow: "var(--shadow-soft)", animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: "var(--color-primary-tint)" }}
                >
                  {meta.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="font-bold truncate">{o.name}</div>
                    <ShieldCheck size={14} className="text-primary shrink-0" />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <Star size={11} className="fill-gold text-gold" />
                    <span className="text-foreground font-semibold">{o.rating}</span>
                    <span>·</span>
                    <MapPin size={11} />
                    <span>{o.distance < 1 ? `${Math.round(o.distance * 1000)} m` : `${o.distance.toFixed(1)} km`}</span>
                    <span>·</span>
                    <span className="font-semibold text-foreground">ETA: {o.eta} min</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
                    style={{ background: "var(--color-primary-tint)", color: "var(--color-primary)" }}
                  >
                    {isConfirmed ? "Confirmed" : "Accepted"}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  Urgency fee: <span className="text-foreground font-semibold">{URGENCY_FEE} JOD</span>
                </div>
                <div className="text-lg font-bold">{o.total} JOD</div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={() => toast(`Directions to ${o.name}`)}
                  className="spring-tap rounded-full py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5"
                  style={{ background: "var(--color-primary-tint)", color: "var(--color-primary)" }}
                >
                  <Navigation size={14} /> Directions
                </button>
                <button
                  disabled={!!confirmed}
                  onClick={() => {
                    setConfirmed(o.name);
                    toast.success(`${o.name} is on the way · ETA ${o.eta} min`);
                    setTimeout(() => navigate({ to: "/bookings" }), 1400);
                  }}
                  className="spring-tap rounded-full py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 text-white disabled:opacity-60"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <Check size={14} /> {isConfirmed ? "Confirmed" : "Confirm"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cancel SOS */}
      {!confirmed && (
        <div className="fixed bottom-0 inset-x-0 px-5 pb-6 pt-4 bg-gradient-to-t from-background via-background/95 to-transparent">
          <button
            onClick={() => { toast("Emergency cancelled"); navigate({ to: "/" }); }}
            className="spring-tap w-full rounded-full py-3.5 font-semibold flex items-center justify-center gap-2"
            style={{ background: "var(--color-primary-tint)", color: "var(--color-primary)" }}
          >
            <X size={16} /> Cancel SOS
          </button>
        </div>
      )}
    </div>
  );
}
