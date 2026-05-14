import { useEffect, useMemo, useState } from "react";
import {
  X, Calendar as CalendarIcon, Zap, Wallet, Banknote, CreditCard,
  Check, Loader2, AlertTriangle, Clock, Users, ChevronLeft,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { getGroups, type SplitGroup } from "@/lib/split-groups";
import { Link } from "@tanstack/react-router";

type Mode = "now" | "schedule";
type PayMethod = "wallet" | "cash" | "split";
type Step = 1 | 2 | 3 | 4;

interface ServiceRow {
  id: string;
  pro_id: string | null;
  name_en: string;
  price: number;
  duration_mins: number | null;
}

const TIME_SLOTS = ["09:00", "10:30", "12:00", "14:00", "16:00", "18:00", "19:30"];

export function BookingSheet({ serviceId, proName, open, onClose }: {
  serviceId: string | null; proName: string; open: boolean; onClose: () => void;
}) {
  if (!open || !serviceId) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-up" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md glass-strong rounded-[28px] overflow-hidden animate-fade-up"
        style={{ maxHeight: "calc(100dvh - 2rem)" }}
      >
        <BookingFlow serviceId={serviceId} proName={proName} onClose={onClose} />
      </div>
    </div>
  );
}

function BookingFlow({ serviceId, proName: initialProName, onClose }: {
  serviceId: string; proName: string; onClose: () => void;
}) {
  const [step, setStep] = useState<Step>(1);
  const [mode, setMode] = useState<Mode>("now");
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>("wallet");
  const [groupId, setGroupId] = useState<string | null>(null);

  const [service, setService] = useState<ServiceRow | null>(null);
  const [proName, setProName] = useState(initialProName);
  const [walletId, setWalletId] = useState<string | null>(null);
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
          .from("services").select("id, pro_id, name_en, price, duration_mins")
          .eq("id", serviceId).maybeSingle();
        if (svcErr) throw svcErr;
        if (!svc) throw new Error("Service not found");
        if (cancelled) return;
        setService(svc as ServiceRow);
        if (uid) {
          const { data: w } = await supabase.from("wallets").select("id, balance").eq("user_id", uid).maybeSingle();
          if (w) { setWalletId(w.id); setBalance(Number(w.balance ?? 0)); }
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

  const price = Number(service?.price ?? 0);
  const selectedGroup = groups.find((g) => g.id === groupId) ?? null;
  const splitCount = selectedGroup ? selectedGroup.members.length + 1 : 1;
  const perPerson = price / splitCount;
  const insufficient = (payMethod === "wallet" && balance < price) || (payMethod === "split" && balance < price);

  const scheduledAt = useMemo(() => {
    if (mode === "now" || !date || !time) return null;
    const [h, m] = time.split(":").map(Number);
    const d = new Date(date); d.setHours(h, m, 0, 0); return d;
  }, [mode, date, time]);

  const canContinue =
    (step === 1 && (mode === "now" || (date && time))) ||
    (step === 2 && (payMethod !== "split" || !!groupId)) ||
    step === 3;

  const handleConfirm = async () => {
    if (!userId) { toast.error("Please log in to book"); return; }
    if (!service) return;
    if ((payMethod === "wallet" || payMethod === "split") && balance < price) { toast.error("Insufficient balance"); return; }

    setSubmitting(true);
    try {
      const dbPayMethod = payMethod === "split" ? "wallet" : payMethod;
      const { data: booking, error: bErr } = await supabase
        .from("bookings").insert({
          service_id: service.id, pro_id: service.pro_id, customer_id: userId,
          total_amount: price, commission_amount: price * 0.15,
          status: "pending", payment_method: dbPayMethod,
          scheduled_at: scheduledAt ? scheduledAt.toISOString() : null,
          notes: payMethod === "split" && selectedGroup ? `Split with ${selectedGroup.name} (${splitCount} ppl)` : null,
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
    return (
      <div className="p-12 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
    );
  }

  if (confirmed) {
    return <Confirmed ref_={confirmed.ref} proName={proName} perPerson={confirmed.perPerson} group={confirmed.group} onClose={onClose} />;
  }

  return (
    <div className="flex flex-col" style={{ maxHeight: "calc(100dvh - 2rem)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={() => step === 1 ? onClose() : setStep((s) => Math.max(1, s - 1) as Step)}
          className="spring-tap w-9 h-9 rounded-full flex items-center justify-center bg-muted/60"
          aria-label="Back"
        >
          <ChevronLeft size={18} className="rtl:rotate-180" />
        </button>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Step {step}/3</div>
          <div className="text-sm font-bold">{stepTitle(step)}</div>
        </div>
        <button onClick={onClose} className="spring-tap w-9 h-9 rounded-full flex items-center justify-center bg-muted/60" aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <div className="flex gap-1.5 px-4 pb-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-1 flex-1 rounded-full transition-colors"
            style={{ background: i <= step ? "var(--color-primary)" : "color-mix(in oklab, var(--color-primary) 12%, white)" }} />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-3">
        {step === 1 && <Step1 mode={mode} setMode={setMode} date={date} setDate={setDate} time={time} setTime={setTime} />}
        {step === 2 && (
          <Step2
            payMethod={payMethod} setPayMethod={setPayMethod}
            balance={balance} price={price}
            groups={groups} groupId={groupId} setGroupId={setGroupId}
            perPerson={perPerson} splitCount={splitCount}
          />
        )}
        {step === 3 && service && (
          <Step3 proName={proName} serviceName={service.name_en} duration={service.duration_mins}
            price={price} mode={mode} scheduledAt={scheduledAt} payMethod={payMethod}
            group={selectedGroup} perPerson={perPerson} />
        )}
        {step === 4 && <Step4Insufficient balance={balance} price={price} />}
      </div>

      <div className="px-4 pt-2 pb-4 border-t border-border/60 bg-white/40">
        {step < 3 && (
          <button onClick={() => setStep((s) => Math.min(3, s + 1) as Step)} disabled={!canContinue}
            className="spring-tap w-full rounded-2xl py-3 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-float)" }}>
            Continue
          </button>
        )}
        {step === 3 && (
          <button onClick={() => insufficient ? setStep(4) : handleConfirm()} disabled={submitting}
            className="spring-tap w-full rounded-2xl py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-float)" }}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <>Confirm booking <Check size={16} /></>}
          </button>
        )}
        {step === 4 && (
          <Link to="/wallet" onClick={onClose} className="spring-tap block text-center w-full rounded-2xl py-3 text-sm font-semibold text-white"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-float)" }}>
            Top up wallet
          </Link>
        )}
      </div>
    </div>
  );
}

function stepTitle(s: Step) {
  return s === 1 ? "When" : s === 2 ? "Payment" : s === 3 ? "Review" : "Insufficient balance";
}

function Step1({ mode, setMode, date, setDate, time, setTime }: any) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        <ModeCard active={mode === "now"} onClick={() => setMode("now")} icon={<Zap size={18} />} title="Book Now" sub="Immediate" />
        <ModeCard active={mode === "schedule"} onClick={() => setMode("schedule")} icon={<CalendarIcon size={18} />} title="Schedule" sub="Pick time" />
      </div>
      {mode === "schedule" && (
        <div className="space-y-2.5 animate-fade-up">
          <div className="glass rounded-2xl p-1.5 flex justify-center">
            <Calendar mode="single" selected={date} onSelect={setDate}
              disabled={(d: Date) => d < new Date(new Date().setHours(0, 0, 0, 0))} initialFocus
              className={cn("p-2 pointer-events-auto")} />
          </div>
          <div>
            <div className="text-xs font-bold mb-1.5">Pick a time</div>
            <div className="grid grid-cols-3 gap-1.5">
              {TIME_SLOTS.map((tt) => {
                const active = time === tt;
                return (
                  <button key={tt} onClick={() => setTime(tt)}
                    className="spring-tap rounded-xl py-2 text-sm font-semibold border transition-colors"
                    style={{
                      background: active ? "var(--color-primary)" : "white",
                      color: active ? "white" : "var(--color-foreground)",
                      borderColor: active ? "var(--color-primary)" : "var(--color-border)",
                    }}>
                    {tt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModeCard({ active, onClick, icon, title, sub }: any) {
  return (
    <button onClick={onClick} className="spring-tap rounded-2xl p-3 text-start border transition-colors"
      style={{
        background: active ? "color-mix(in oklab, var(--color-primary) 8%, white)" : "white",
        borderColor: active ? "var(--color-primary)" : "var(--color-border)",
      }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white mb-1.5"
        style={{ background: "var(--gradient-primary)" }}>{icon}</div>
      <div className="font-bold text-sm">{title}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </button>
  );
}

function Step2({ payMethod, setPayMethod, balance, price, groups, groupId, setGroupId, perPerson, splitCount }: any) {
  return (
    <div className="space-y-2.5">
      <PayCard active={payMethod === "wallet"} onClick={() => setPayMethod("wallet")}
        icon={<Wallet size={18} />} title="Wallet" sub={`Balance: ${balance.toFixed(2)} JOD`}
        warn={balance < price ? "Not enough balance" : undefined} />
      <PayCard active={payMethod === "cash"} onClick={() => setPayMethod("cash")}
        icon={<Banknote size={18} />} title="Cash" sub="Pay the pro directly" />
      <PayCard active={payMethod === "split"} onClick={() => setPayMethod("split")}
        icon={<Users size={18} />} title="Split with group"
        sub={groups.length === 0 ? "Create a group in Wallet first" : "Share the cost with your saved group"} />
      {payMethod === "split" && (
        <div className="rounded-2xl border border-border bg-white p-3 space-y-2 animate-fade-up">
          {groups.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              Go to <Link to="/wallet" className="text-primary font-semibold">Wallet</Link> to create a group.
            </div>
          ) : (
            <>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Choose group</div>
              <div className="space-y-1.5">
                {groups.map((g: SplitGroup) => {
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
                        <div className="text-[11px] text-muted-foreground">{g.members.length + 1} ppl · {(price / (g.members.length + 1)).toFixed(2)} JOD each</div>
                      </div>
                      {active && <Check size={16} className="text-primary" />}
                    </button>
                  );
                })}
              </div>
              {groupId && (
                <div className="rounded-xl bg-primary-tint p-2.5 text-xs">
                  You'll pay full <b>{price.toFixed(2)} JOD</b> upfront. Each of {splitCount} members owes <b>{perPerson.toFixed(2)} JOD</b>.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PayCard({ active, onClick, icon, title, sub, warn }: any) {
  return (
    <button onClick={onClick}
      className="spring-tap w-full rounded-2xl p-3 text-start border flex items-center gap-3 transition-colors"
      style={{
        background: active ? "color-mix(in oklab, var(--color-primary) 8%, white)" : "white",
        borderColor: active ? "var(--color-primary)" : "var(--color-border)",
      }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
        style={{ background: "var(--gradient-primary)" }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">{title}</div>
        <div className="text-[11px] text-muted-foreground">{sub}</div>
        {warn && <div className="text-[10px] text-destructive font-semibold mt-0.5">{warn}</div>}
      </div>
      {active && <Check size={16} className="text-primary" />}
    </button>
  );
}

function Step3({ proName, serviceName, duration, price, mode, scheduledAt, payMethod, group, perPerson }: any) {
  const payLabel = payMethod === "wallet" ? "Wallet" : payMethod === "cash" ? "Cash" : `Split · ${group?.name ?? ""}`;
  return (
    <div className="space-y-2.5">
      <div className="glass rounded-2xl p-4 space-y-2.5">
        <Row label="Pro" value={proName} />
        <Row label="Service" value={serviceName} />
        <Row label="When"
          value={mode === "now" ? "ASAP · Immediate" : scheduledAt ? format(scheduledAt, "PPP · p") : "—"}
          icon={mode === "now" ? <Zap size={14} /> : <CalendarIcon size={14} />} />
        <Row label="Duration" value={`${duration ?? 60} min`} icon={<Clock size={14} />} />
        <Row label="Payment" value={payLabel} />
        {payMethod === "split" && group && (
          <div className="rounded-xl bg-primary-tint p-2.5 text-xs space-y-0.5">
            <div className="flex justify-between"><span>Per person</span><b>{perPerson.toFixed(2)} JOD</b></div>
            <div className="flex justify-between"><span>Members</span><b>{group.members.length + 1}</b></div>
          </div>
        )}
      </div>
      <div className="glass-strong rounded-2xl p-4 flex items-end justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Total</div>
          <div className="text-2xl font-bold text-primary">{price.toFixed(2)} <span className="text-sm font-semibold">JOD</span></div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, icon }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold text-sm flex items-center gap-1.5">{icon}<span>{value}</span></div>
    </div>
  );
}

function Step4Insufficient({ balance, price }: any) {
  return (
    <div className="glass rounded-2xl p-5 text-center space-y-2">
      <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-white"
        style={{ background: "oklch(0.65 0.18 25)" }}><AlertTriangle size={20} /></div>
      <h2 className="text-base font-bold">Insufficient balance</h2>
      <p className="text-xs text-muted-foreground">
        You need {(price - balance).toFixed(2)} more JOD.
      </p>
    </div>
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
      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="spring-tap flex-1 rounded-2xl py-2.5 text-sm font-semibold border border-border bg-white">Done</button>
      </div>
    </div>
  );
}
