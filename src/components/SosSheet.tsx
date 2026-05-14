import { useEffect, useMemo, useState } from "react";
import { Siren, X, Star, ShieldCheck, Check, Navigation, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

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

const SOS_KINDS = [
  { id: "plumber", label: "Plumber", emoji: "🔧" },
  { id: "electrician", label: "Electrician", emoji: "⚡" },
  { id: "locksmith", label: "Locksmith", emoji: "🔑" },
  { id: "tow", label: "Tow / Mechanic", emoji: "🚗" },
  { id: "ac", label: "AC Repair", emoji: "❄️" },
  { id: "medical", label: "Medical", emoji: "🚑" },
];

export function SosSheet({ open, onClose }: Props) {
  const [step, setStep] = useState<"pick" | "offers">("pick");
  const [kind, setKind] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const meta = kind ? KIND_META[kind] : null;
  const offers = useMemo(() => meta?.sample.map((s) => ({ ...s, total: s.price + URGENCY_FEE })) ?? [], [meta]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep("pick");
        setKind(null);
        setRevealed(0);
        setConfirmed(null);
      }, 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Stagger offer reveals
  useEffect(() => {
    if (step !== "offers" || revealed >= offers.length) return;
    const t = setTimeout(() => setRevealed((i) => Math.min(i + 1, offers.length)), 900);
    return () => clearTimeout(t);
  }, [step, revealed, offers.length]);

  if (!open) return null;

  const visible = offers.slice(0, revealed);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fade-up"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-3xl px-5 pt-3 pb-5 max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: "var(--shadow-float)" }}
      >
        <div className="mx-auto h-1.5 w-10 rounded-full bg-muted mb-3" />

        {step === "pick" && (
          <div className="space-y-5 animate-fade-up">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
                  style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 22), oklch(0.55 0.24 18))" }}
                >
                  <Siren size={18} />
                </div>
                <div className="font-bold text-lg leading-tight">SOS Emergency</div>
              </div>
              <button onClick={onClose} aria-label="Close" className="text-muted-foreground p-1">
                <X size={20} />
              </button>
            </div>
            <div className="text-sm text-muted-foreground -mt-2">
              Broadcast to nearest verified providers. Urgency fee applies.
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {SOS_KINDS.map((k) => {
                const active = kind === k.id;
                return (
                  <button
                    key={k.id}
                    onClick={() => setKind(k.id)}
                    className={`spring-tap rounded-2xl p-3 flex flex-col items-center gap-1.5 border ${active ? "border-primary" : "border-border bg-white"}`}
                    style={{ background: active ? "var(--color-primary-tint)" : undefined }}
                  >
                    <span className="text-2xl">{k.emoji}</span>
                    <span className="text-xs font-semibold text-center leading-tight">{k.label}</span>
                  </button>
                );
              })}
            </div>
            <button
              disabled={!kind}
              onClick={() => { setStep("offers"); setRevealed(0); }}
              className="spring-tap w-full rounded-full py-3.5 font-semibold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 22), oklch(0.55 0.24 18))" }}
            >
              Send emergency request
            </button>
          </div>
        )}

        {step === "offers" && meta && (
          <div className="space-y-3 animate-fade-up">
            <div className="flex items-start justify-between gap-3">
              <button
                onClick={() => { setStep("pick"); setRevealed(0); setConfirmed(null); }}
                className="spring-tap w-9 h-9 rounded-full flex items-center justify-center bg-muted"
                aria-label="Back"
              >
                <ArrowLeft size={16} className="rtl:rotate-180" />
              </button>
              <div className="flex-1 flex items-center gap-2.5 min-w-0">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0"
                  style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 22), oklch(0.55 0.24 18))" }}
                >
                  <Siren size={18} />
                </div>
                <div className="min-w-0">
                  <div className="font-bold leading-tight truncate">{meta.label} · SOS</div>
                  <div className="text-[11px] text-muted-foreground">
                    {revealed < offers.length ? "Searching nearby providers…" : `${offers.length} offers received`}
                  </div>
                </div>
              </div>
              <button onClick={onClose} aria-label="Close" className="text-muted-foreground p-1">
                <X size={20} />
              </button>
            </div>

            {revealed === 0 && (
              <div className="py-8 flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="animate-spin text-destructive" size={26} />
                <div className="text-sm">Broadcasting to verified providers…</div>
              </div>
            )}

            {visible.map((o) => {
              const isConfirmed = confirmed === o.name;
              const isDimmed = confirmed && !isConfirmed;
              return (
                <div
                  key={o.name}
                  className={`rounded-3xl bg-white border border-border p-4 animate-fade-up transition-opacity ${isDimmed ? "opacity-40" : ""}`}
                  style={{ boxShadow: "var(--shadow-soft)" }}
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
                        <span>{o.distance < 1 ? `${Math.round(o.distance * 1000)} m` : `${o.distance.toFixed(1)} km`}</span>
                        <span>·</span>
                        <span className="font-semibold text-foreground">ETA {o.eta} min</span>
                      </div>
                    </div>
                    <div
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shrink-0"
                      style={{ background: "var(--color-primary-tint)", color: "var(--color-primary)" }}
                    >
                      {isConfirmed ? "Confirmed" : "Accepted"}
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
                        setTimeout(onClose, 1400);
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

            {!confirmed && (
              <button
                onClick={onClose}
                className="spring-tap w-full rounded-full py-3 font-semibold flex items-center justify-center gap-2 mt-2"
                style={{ background: "var(--color-primary-tint)", color: "var(--color-primary)" }}
              >
                <X size={16} /> Cancel SOS
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
