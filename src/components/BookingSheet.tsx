import { useEffect, useMemo, useState } from "react";
import {
  X, Wallet, Banknote, Users, Check, Loader2, Clock, Calendar as CalendarIcon,
  Star, ShieldCheck, MapPin, Minus, Plus, CreditCard,
} from "lucide-react";
import { format, addDays, isSameDay } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getGroups, type SplitGroup } from "@/lib/split-groups";
import { Link } from "@tanstack/react-router";

type PayMethod = "wallet" | "cliq" | "cash" | "split";

interface ServiceRow {
  id: string;
  pro_id: string | null;
  name_en: string;
  price: number;
  duration_mins: number | null;
  category: string | null;
  subcategory: string | null;
}

const TIME_SLOTS = ["10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];

const SUBCAT_EMOJI: Record<string, string> = {
  cleaning: "🧼", laundry: "🧺", pest: "🪲", painting: "🎨",
  padel: "🎾", football: "⚽", gym: "🏋️", swim: "🏊", tennis: "🎾",
  dentist: "🦷", optician: "👓", lab: "🧪",
  barber: "💈", salon: "💇", hammam: "🛁", spa: "💆",
};

export function BookingSheet({ serviceId, proName, open, onClose }: {
  serviceId: string | null; proName: string; open: boolean; onClose: () => void;
}) {
  if (!open || !serviceId) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-up" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] overflow-hidden animate-fade-up flex flex-col"
        style={{ maxHeight: "calc(100dvh - 1rem)", boxShadow: "var(--shadow-float)" }}
      >
        <BookingFlow serviceId={serviceId} proName={proName} onClose={onClose} />
      </div>
    </div>
  );
}

function BookingFlow({ serviceId, proName: initialProName, onClose }: {
  serviceId: string; proName: string; onClose: () => void;
}) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const days = useMemo(() => Array.from({ length: 5 }, (_, i) => addDays(today, i)), [today]);

  const [day, setDay] = useState<Date>(today);
  const [time, setTime] = useState<string>("18:00");
  const [hours, setHours] = useState(2);
  const [payMethod, setPayMethod] = useState<PayMethod>("wallet");
  const [groupId, setGroupId] = useState<string | null>(null);

  const [service, setService] = useState<ServiceRow | null>(null);
  const [proName, setProName] = useState(initialProName);
  const [balance, setBalance] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{ ref: string; perPerson?: number; group?: SplitGroup } | null>(null);
  const [groups, setGroups] = useState<SplitGroup[]>([]);

  useEffect(() => { setGroups(getGroups()); }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id ?? null;
        setUserId(uid);
        const { data: svc, error: svcErr } = await supabase
          .from("services").select("id, pro_id, name_en, price, duration_mins, category, subcategory")
          .eq("id", serviceId).maybeSingle();
        if (svcErr) throw svcErr;
        if (!svc) throw new Error("Service not found");
        if (cancelled) return;
        setService(svc as ServiceRow);
        if (uid) {
          const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", uid).maybeSingle();
          if (w) setBalance(Number(w.balance ?? 0));
        }
        if (svc.pro_id) {
          const { data: pro } = await supabase.from("users").select("full_name").eq("id", svc.pro_id).maybeSingle();
          if (!cancelled && pro?.full_name) setProName(pro.full_name);
        }
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load");
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [serviceId]);

  const unitPrice = Number(service?.price ?? 0);
  const total = unitPrice * hours;
  const selectedGroup = groups.find((g) => g.id === groupId) ?? null;
  const splitCount = selectedGroup ? selectedGroup.members.length + 1 : 1;
  const perPerson = total / splitCount;
  const insufficient = (payMethod === "wallet" || payMethod === "split") && balance < total;

  const scheduledAt = useMemo(() => {
    const [h, m] = time.split(":").map(Number);
    const d = new Date(day); d.setHours(h, m, 0, 0); return d;
  }, [day, time]);

  const emoji =
    (service?.subcategory && SUBCAT_EMOJI[service.subcategory]) || "✨";

  const handleConfirm = async () => {
    if (!userId) { toast.error("Please log in to book"); return; }
    if (!service) return;
    if (insufficient) { toast.error("Insufficient wallet balance"); return; }
    if (payMethod === "split" && !groupId) { toast.error("Select a group to split with"); return; }

    setSubmitting(true);
    try {
      const dbPayMethod = payMethod === "split" ? "wallet" : payMethod;
      const { data: booking, error: bErr } = await supabase
        .from("bookings").insert({
          service_id: service.id, pro_id: service.pro_id, customer_id: userId,
          total_amount: total, commission_amount: total * 0.15,
          status: "pending", payment_method: dbPayMethod,
          scheduled_at: scheduledAt.toISOString(),
          notes: [
            `${hours}h`,
            payMethod === "cliq" ? "CliQ" : null,
            payMethod === "split" && selectedGroup ? `Split with ${selectedGroup.name} (${splitCount} ppl)` : null,
          ].filter(Boolean).join(" · ") || null,
        }).select("id").single();
      if (bErr) throw bErr;

      if (payMethod === "wallet" || payMethod === "split") {
        const { error: payErr } = await supabase.rpc("confirm_booking_payment", { p_booking_id: booking.id });
        if (payErr) throw payErr;
      }

      setConfirmed({
        ref: booking.id.slice(0, 8).toUpperCase(),
        perPerson: payMethod === "split" ? perPerson : undefined,
        group: payMethod === "split" ? selectedGroup ?? undefined : undefined,
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Booking failed");
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return <div className="p-12 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  if (confirmed) {
    return <Confirmed ref_={confirmed.ref} proName={proName} perPerson={confirmed.perPerson} group={confirmed.group} onClose={onClose} />;
  }

  return (
    <>
      {/* Drag handle */}
      <div className="pt-2 pb-1 flex justify-center sm:hidden">
        <div className="w-10 h-1 rounded-full bg-muted" />
      </div>

      {/* Header — provider identity */}
      <div className="px-5 pt-3 pb-4 flex items-start gap-3 border-b border-border/60">
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
            {service?.category ?? "Service"}
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-xs">
            <span className="flex items-center gap-1 font-semibold">
              <Star size={12} className="fill-gold text-gold" /> 4.9 <span className="text-muted-foreground font-normal">(320)</span>
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <MapPin size={12} /> 0.8 km
            </span>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="spring-tap w-8 h-8 -mt-1 -mr-1 flex items-center justify-center text-muted-foreground">
          <X size={20} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-3 space-y-5">
        {/* Choose day */}
        <section>
          <div className="flex items-center gap-2 mb-2.5">
            <CalendarIcon size={16} className="text-primary" />
            <h3 className="font-bold text-[15px]">Choose day</h3>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
            {days.map((d, i) => {
              const active = isSameDay(d, day);
              const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(d, "EEE");
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setDay(d)}
                  className="spring-tap shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold border transition-colors"
                  style={{
                    background: active ? "var(--color-primary)" : "white",
                    color: active ? "white" : "var(--color-foreground)",
                    borderColor: active ? "var(--color-primary)" : "var(--color-border)",
                    boxShadow: active ? "var(--shadow-soft)" : undefined,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Choose time */}
        <section>
          <div className="flex items-center gap-2 mb-2.5">
            <Clock size={16} className="text-primary" />
            <h3 className="font-bold text-[15px]">Choose time</h3>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {TIME_SLOTS.map((tt) => {
              const active = time === tt;
              return (
                <button
                  key={tt}
                  onClick={() => setTime(tt)}
                  className="spring-tap rounded-2xl py-3 text-sm font-semibold border transition-colors"
                  style={{
                    background: active ? "var(--color-primary)" : "white",
                    color: active ? "white" : "var(--color-foreground)",
                    borderColor: active ? "var(--color-primary)" : "var(--color-border)",
                    boxShadow: active ? "var(--shadow-soft)" : "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                >
                  {tt}
                </button>
              );
            })}
          </div>
        </section>

        {/* Duration hours */}
        <section>
          <div className="flex items-center gap-2 mb-2.5">
            <Clock size={16} className="text-primary" />
            <h3 className="font-bold text-[15px]">Duration (hours)</h3>
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setHours((h) => Math.max(1, h - 1))}
              aria-label="Decrease hours"
              className="spring-tap w-12 h-12 rounded-full bg-white border border-border flex items-center justify-center"
              style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
            >
              <Minus size={18} />
            </button>
            <div className="text-3xl font-bold tabular-nums">{hours}</div>
            <button
              onClick={() => setHours((h) => Math.min(8, h + 1))}
              aria-label="Increase hours"
              className="spring-tap w-12 h-12 rounded-full bg-white border border-border flex items-center justify-center"
              style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
            >
              <Plus size={18} />
            </button>
          </div>
        </section>

        {/* Payment method */}
        <section>
          <div className="flex items-center gap-2 mb-2.5">
            <Wallet size={16} className="text-primary" />
            <h3 className="font-bold text-[15px]">Payment method</h3>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <PayTile active={payMethod === "wallet"} onClick={() => setPayMethod("wallet")} icon={<Wallet size={18} />} label="Wallet" />
            <PayTile active={payMethod === "cliq"} onClick={() => setPayMethod("cliq")} icon={<CreditCard size={18} />} label="CliQ" />
            <PayTile active={payMethod === "cash"} onClick={() => setPayMethod("cash")} icon={<Banknote size={18} />} label="Cash" />
            <PayTile active={payMethod === "split"} onClick={() => setPayMethod("split")} icon={<Users size={18} />} label="Split" />
          </div>
          {payMethod === "wallet" && (
            <div className="mt-2 text-[11px] text-muted-foreground px-1">
              Balance: <span className="font-semibold text-foreground">{balance.toFixed(2)} JOD</span>
              {insufficient && <span className="text-destructive font-semibold ms-2">· Not enough</span>}
            </div>
          )}
          {payMethod === "cliq" && (
            <div className="mt-2 text-[11px] text-muted-foreground px-1">Pay instantly via CliQ to the provider after confirmation.</div>
          )}
          {payMethod === "split" && (
            <div className="mt-2.5 rounded-2xl border border-border bg-white p-3 space-y-2 animate-fade-up">
              {groups.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  Go to <Link to="/wallet" className="text-primary font-semibold">Wallet</Link> to create a group first.
                </div>
              ) : (
                <>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Choose group</div>
                  <div className="space-y-1.5">
                    {groups.map((g) => {
                      const active = g.id === groupId;
                      return (
                        <button key={g.id} onClick={() => setGroupId(g.id)}
                          className="spring-tap w-full rounded-xl p-2.5 border flex items-center justify-between text-start transition-colors"
                          style={{
                            background: active ? "color-mix(in oklab, var(--color-primary) 8%, white)" : "white",
                            borderColor: active ? "var(--color-primary)" : "var(--color-border)",
                          }}>
                          <div>
                            <div className="font-semibold text-sm">{g.name}</div>
                            <div className="text-[11px] text-muted-foreground">{g.members.length + 1} ppl · {(total / (g.members.length + 1)).toFixed(2)} JOD each</div>
                          </div>
                          {active && <Check size={16} className="text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Sticky total + confirm */}
      <div className="border-t border-border/60 bg-white/95 backdrop-blur px-5 pt-3 pb-5">
        <div className="flex items-end justify-between mb-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Total</div>
          <div className="text-2xl font-bold">
            {total.toFixed(2)} <span className="text-sm font-semibold">JOD</span>
          </div>
        </div>
        <button
          onClick={handleConfirm}
          disabled={submitting || insufficient || (payMethod === "split" && !groupId)}
          className="spring-tap w-full rounded-full py-4 text-base font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-float)" }}
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : "Confirm booking"}
        </button>
        {insufficient && (
          <Link to="/wallet" onClick={onClose} className="block text-center text-xs text-primary font-semibold mt-2">
            Top up wallet →
          </Link>
        )}
      </div>
    </>
  );
}

function PayTile({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; }) {
  return (
    <button
      onClick={onClick}
      className="spring-tap rounded-2xl py-3 px-1 flex flex-col items-center gap-1.5 border transition-colors"
      style={{
        background: active ? "color-mix(in oklab, var(--color-primary) 8%, white)" : "white",
        borderColor: active ? "var(--color-primary)" : "var(--color-border)",
        color: active ? "var(--color-primary)" : "var(--color-foreground)",
        boxShadow: active ? "0 4px 12px -4px color-mix(in oklab, var(--color-primary) 30%, transparent)" : "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      {icon}
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}

function Confirmed({ ref_, proName, perPerson, group, onClose }: {
  ref_: string; proName: string; perPerson?: number; group?: SplitGroup; onClose: () => void;
}) {
  const message = group && perPerson
    ? encodeURIComponent(`Hey! I just booked ${proName} on Khidmati and split it with ${group.name}. Your share is ${perPerson.toFixed(2)} JOD. Send via wallet code in the app 🙏`)
    : "";
  return (
    <div className="p-6 text-center space-y-3 animate-fade-up">
      <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white"
        style={{ background: "var(--gradient-primary)" }}><Check size={26} /></div>
      <div>
        <h2 className="text-lg font-bold">Booking confirmed</h2>
        <p className="text-xs text-muted-foreground mt-1">Ref #{ref_} · with {proName}</p>
      </div>
      {group && perPerson && (
        <div className="rounded-2xl bg-primary-tint p-3 text-start space-y-1.5">
          <div className="text-xs font-bold">{group.name} · {group.members.length + 1} ppl</div>
          <div className="text-[11px] text-muted-foreground">Each owes <b>{perPerson.toFixed(2)} JOD</b>. Notify members below.</div>
          <div className="space-y-1 pt-1">
            {group.members.map((m) => (
              <a key={m.code} href={`https://wa.me/?text=${message}`} target="_blank" rel="noreferrer"
                className="spring-tap flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs">
                <span className="font-semibold">{m.name}</span>
                <span className="text-primary font-bold">Notify on WhatsApp</span>
              </a>
            ))}
          </div>
        </div>
      )}
      <div className="pt-1">
        <button onClick={onClose} className="spring-tap w-full rounded-full py-3 text-sm font-semibold text-white"
          style={{ background: "var(--gradient-primary)" }}>Done</button>
      </div>
    </div>
  );
}
