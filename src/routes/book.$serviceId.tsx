import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Calendar as CalendarIcon, Zap, Wallet, Banknote, CreditCard,
  Check, Loader2, AlertTriangle, Clock,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/book/$serviceId")({
  head: () => ({
    meta: [{ title: "Khidmati · Book" }],
  }),
  component: BookingFlow,
});

type Mode = "now" | "schedule";
type PayMethod = "wallet" | "cash" | "card";
type Step = 1 | 2 | 3 | 4;

interface ServiceRow {
  id: string;
  pro_id: string | null;
  name_en: string;
  price: number;
  duration_mins: number | null;
}

interface WalletRow {
  id: string;
  balance: number | null;
  currency: string | null;
}

const TIME_SLOTS = ["09:00", "10:30", "12:00", "14:00", "16:00", "18:00", "19:30"];

function BookingFlow() {
  const { serviceId } = useParams({ from: "/book/$serviceId" });
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [mode, setMode] = useState<Mode>("now");
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>("wallet");

  const [service, setService] = useState<ServiceRow | null>(null);
  const [proName, setProName] = useState("");
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{ ref: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id ?? null;
        if (cancelled) return;
        setUserId(uid);

        const svcReq = supabase
          .from("services")
          .select("id, pro_id, name_en, price, duration_mins")
          .eq("id", serviceId)
          .maybeSingle();

        const walletReq = uid
          ? supabase.from("wallets").select("id, balance, currency").eq("user_id", uid).maybeSingle()
          : Promise.resolve({ data: null, error: null } as any);

        const [{ data: svc, error: svcErr }, { data: w }] = await Promise.all([svcReq, walletReq]);
        if (svcErr) throw svcErr;
        if (!svc) throw new Error("Service not found");
        if (cancelled) return;
        setService(svc as ServiceRow);
        setWallet(w as WalletRow | null);

        if (svc.pro_id) {
          const { data: pro } = await supabase
            .from("users").select("full_name").eq("id", svc.pro_id).maybeSingle();
          if (!cancelled) setProName(pro?.full_name ?? svc.name_en);
        } else {
          setProName(svc.name_en);
        }
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [serviceId]);

  const price = Number(service?.price ?? 0);
  const balance = Number(wallet?.balance ?? 0);
  const insufficient = payMethod === "wallet" && balance < price;

  const scheduledAt = useMemo(() => {
    if (mode === "now" || !date || !time) return null;
    const [h, m] = time.split(":").map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d;
  }, [mode, date, time]);

  const goNext = () => setStep((s) => (Math.min(4, s + 1) as Step));
  const goBack = () => {
    if (step === 1) navigate({ to: "/pro/$id", params: { id: serviceId } });
    else setStep((s) => (Math.max(1, s - 1) as Step));
  };

  const canContinue =
    (step === 1 && (mode === "now" || (date && time))) ||
    (step === 2 && payMethod !== "card") ||
    step === 3;

  const handleConfirm = async () => {
    if (!userId) {
      toast.error("Please log in to book");
      navigate({ to: "/login" });
      return;
    }
    if (!service) return;
    if (payMethod === "wallet" && (!wallet || balance < price)) {
      toast.error("Insufficient balance");
      return;
    }

    setSubmitting(true);
    try {
      const { data: booking, error: bErr } = await supabase
        .from("bookings")
        .insert({
          service_id: service.id,
          pro_id: service.pro_id,
          customer_id: userId,
          total_amount: price,
          commission_amount: price * 0.15,
          status: "pending",
          payment_method: payMethod,
          scheduled_at: scheduledAt ? scheduledAt.toISOString() : null,
        })
        .select("id")
        .single();
      if (bErr) throw bErr;

      if (payMethod === "wallet") {
        const { error: payErr } = await supabase.rpc("confirm_booking_payment", {
          p_booking_id: booking.id,
        });
        if (payErr) throw payErr;
      }

      setConfirmed({ ref: booking.id.slice(0, 8).toUpperCase() });
    } catch (e: any) {
      toast.error(e?.message ?? "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  if (confirmed) {
    return <ConfirmedScreen reference={confirmed.ref} proName={proName} />;
  }

  return (
    <div className="px-5 pt-7 pb-32 animate-fade-up">
      {/* header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={goBack}
          aria-label="Back"
          className="spring-tap glass-strong w-11 h-11 rounded-full flex items-center justify-center"
        >
          <ArrowLeft size={18} className="rtl:rotate-180" />
        </button>
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
            Step {step} of 4
          </div>
          <h1 className="text-xl font-bold">{stepTitle(step)}</h1>
        </div>
      </div>

      {/* progress */}
      <div className="flex gap-1.5 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{ background: i <= step ? "var(--color-primary)" : "color-mix(in oklab, var(--color-primary) 12%, white)" }}
          />
        ))}
      </div>

      {step === 1 && (
        <Step1
          mode={mode} setMode={setMode}
          date={date} setDate={setDate}
          time={time} setTime={setTime}
        />
      )}
      {step === 2 && (
        <Step2
          payMethod={payMethod} setPayMethod={setPayMethod}
          balance={balance} currency={wallet?.currency ?? "JOD"}
          price={price}
        />
      )}
      {step === 3 && service && (
        <Step3
          proName={proName}
          serviceName={service.name_en}
          duration={service.duration_mins}
          price={price}
          mode={mode}
          scheduledAt={scheduledAt}
          payMethod={payMethod}
        />
      )}
      {step === 4 && (
        <Step4Insufficient balance={balance} price={price} onTopUp={() => navigate({ to: "/wallet" })} />
      )}

      {/* sticky action */}
      <div className="fixed bottom-0 inset-x-0 z-40 px-5 pb-5 pt-3 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          {step < 3 && (
            <button
              onClick={goNext}
              disabled={!canContinue}
              className="spring-tap w-full rounded-2xl py-3.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-float)" }}
            >
              Continue
            </button>
          )}
          {step === 3 && (
            <button
              onClick={() => (insufficient ? setStep(4) : handleConfirm())}
              disabled={submitting}
              className="spring-tap w-full rounded-2xl py-3.5 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-float)" }}
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <>Confirm booking <Check size={16} /></>}
            </button>
          )}
          {step === 4 && (
            <button
              onClick={() => navigate({ to: "/wallet" })}
              className="spring-tap w-full rounded-2xl py-3.5 text-sm font-semibold text-white"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-float)" }}
            >
              Top up wallet
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function stepTitle(s: Step) {
  switch (s) {
    case 1: return "When";
    case 2: return "Payment method";
    case 3: return "Review & confirm";
    case 4: return "Insufficient balance";
  }
}

function Step1({ mode, setMode, date, setDate, time, setTime }: {
  mode: Mode; setMode: (m: Mode) => void;
  date: Date | undefined; setDate: (d: Date | undefined) => void;
  time: string | null; setTime: (t: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <ModeCard
          active={mode === "now"} onClick={() => setMode("now")}
          icon={<Zap size={20} />} title="Book Now" sub="Immediate request"
        />
        <ModeCard
          active={mode === "schedule"} onClick={() => setMode("schedule")}
          icon={<CalendarIcon size={20} />} title="Schedule" sub="Pick date & time"
        />
      </div>

      {mode === "schedule" && (
        <div className="space-y-3 animate-fade-up">
          <div className="glass rounded-3xl p-2 flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </div>
          <div>
            <div className="text-xs font-bold mb-2">Pick a time</div>
            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map((t) => {
                const active = time === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTime(t)}
                    className="spring-tap rounded-2xl py-2.5 text-sm font-semibold border transition-colors"
                    style={{
                      background: active ? "var(--color-primary)" : "white",
                      color: active ? "white" : "var(--color-foreground)",
                      borderColor: active ? "var(--color-primary)" : "var(--color-border)",
                    }}
                  >
                    {t}
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

function ModeCard({ active, onClick, icon, title, sub }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className="spring-tap rounded-3xl p-4 text-start border transition-colors"
      style={{
        background: active ? "color-mix(in oklab, var(--color-primary) 8%, white)" : "white",
        borderColor: active ? "var(--color-primary)" : "var(--color-border)",
      }}
    >
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center text-white mb-2"
        style={{ background: "var(--gradient-primary)" }}
      >
        {icon}
      </div>
      <div className="font-bold text-sm">{title}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </button>
  );
}

function Step2({ payMethod, setPayMethod, balance, currency, price }: {
  payMethod: PayMethod; setPayMethod: (m: PayMethod) => void;
  balance: number; currency: string; price: number;
}) {
  return (
    <div className="space-y-3">
      <PayCard
        active={payMethod === "wallet"} onClick={() => setPayMethod("wallet")}
        icon={<Wallet size={18} />} title="Wallet"
        sub={`Balance: ${balance.toFixed(2)} ${currency}`}
        warn={balance < price ? "Not enough balance" : undefined}
      />
      <PayCard
        active={payMethod === "cash"} onClick={() => setPayMethod("cash")}
        icon={<Banknote size={18} />} title="Cash"
        sub="Pay the pro directly"
      />
      <PayCard
        active={false} disabled
        onClick={() => {}}
        icon={<CreditCard size={18} />} title="Card"
        sub="Coming soon"
      />
    </div>
  );
}

function PayCard({ active, onClick, icon, title, sub, warn, disabled }: {
  active: boolean; onClick: () => void; icon: React.ReactNode;
  title: string; sub: string; warn?: string; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="spring-tap w-full rounded-3xl p-4 text-start border flex items-center gap-3 transition-colors disabled:opacity-50"
      style={{
        background: active ? "color-mix(in oklab, var(--color-primary) 8%, white)" : "white",
        borderColor: active ? "var(--color-primary)" : "var(--color-border)",
      }}
    >
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0"
        style={{ background: disabled ? "var(--color-muted-foreground)" : "var(--gradient-primary)" }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
        {warn && <div className="text-[11px] text-destructive font-semibold mt-0.5">{warn}</div>}
      </div>
      {active && <Check size={18} className="text-primary" />}
    </button>
  );
}

function Step3({ proName, serviceName, duration, price, mode, scheduledAt, payMethod }: {
  proName: string; serviceName: string; duration: number | null; price: number;
  mode: Mode; scheduledAt: Date | null; payMethod: PayMethod;
}) {
  return (
    <div className="space-y-3">
      <div className="glass rounded-3xl p-5 space-y-3">
        <Row label="Pro" value={proName} />
        <Row label="Service" value={serviceName} />
        <Row
          label="When"
          value={mode === "now" ? "ASAP · Immediate" : scheduledAt ? format(scheduledAt, "PPP · p") : "—"}
          icon={mode === "now" ? <Zap size={14} /> : <CalendarIcon size={14} />}
        />
        <Row
          label="Duration"
          value={`${duration ?? 60} minutes`}
          icon={<Clock size={14} />}
        />
        <Row label="Payment" value={payMethod === "wallet" ? "Wallet" : payMethod === "cash" ? "Cash" : "Card"} />
      </div>
      <div className="glass-strong rounded-3xl p-5 flex items-end justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Total</div>
          <div className="text-3xl font-bold text-primary">
            {price.toFixed(2)} <span className="text-sm font-semibold">JOD</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold text-sm flex items-center gap-1.5">
        {icon}<span>{value}</span>
      </div>
    </div>
  );
}

function Step4Insufficient({ balance, price, onTopUp }: { balance: number; price: number; onTopUp: () => void }) {
  return (
    <div className="space-y-4">
      <div className="glass rounded-3xl p-6 text-center space-y-3">
        <div
          className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white"
          style={{ background: "oklch(0.65 0.18 25)" }}
        >
          <AlertTriangle size={24} />
        </div>
        <h2 className="text-lg font-bold">Insufficient balance</h2>
        <p className="text-sm text-muted-foreground">
          You need {(price - balance).toFixed(2)} more JOD to complete this booking with your wallet.
        </p>
        <div className="flex justify-between text-xs pt-2 border-t border-border">
          <span className="text-muted-foreground">Balance</span>
          <span className="font-semibold">{balance.toFixed(2)} JOD</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Required</span>
          <span className="font-semibold">{price.toFixed(2)} JOD</span>
        </div>
      </div>
    </div>
  );
}

function ConfirmedScreen({ reference, proName }: { reference: string; proName: string }) {
  return (
    <div className="px-6 pt-16 pb-10 text-center animate-fade-up min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center text-white mb-5"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-float)" }}
        >
          <Check size={44} strokeWidth={3} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Booking confirmed</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          {proName} has been notified and will respond shortly.
        </p>
        <div className="glass-strong rounded-2xl px-6 py-4 mt-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Reference</div>
          <div className="text-2xl font-bold text-primary tracking-widest">#{reference}</div>
        </div>
      </div>
      <div className="space-y-2">
        <Link
          to="/bookings"
          className="spring-tap block w-full rounded-2xl py-3.5 text-sm font-semibold text-white"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-float)" }}
        >
          View my bookings
        </Link>
        <Link
          to="/"
          className="spring-tap block w-full rounded-2xl py-3 text-sm font-medium text-primary"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
