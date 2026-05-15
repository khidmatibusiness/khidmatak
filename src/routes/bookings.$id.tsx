import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Calendar, CreditCard, Wallet, Banknote, Loader2, X, Hash, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StatusBadge, formatWhen } from "./bookings";

export const Route = createFileRoute("/bookings/$id")({
  head: () => ({
    meta: [{ title: "Khidmati · Booking" }],
  }),
  component: BookingDetail,
});

interface Detail {
  id: string;
  status: string | null;
  scheduled_at: string | null;
  created_at: string | null;
  total_amount: number;
  payment_method: string | null;
  notes: string | null;
  service_id: string | null;
  pro_id: string | null;
  customer_id: string | null;
  service?: { name_en: string | null; name_ar: string | null; duration_mins: number | null; category: string | null } | null;
  pro?: { full_name: string | null } | null;
}

function BookingDetail() {
  const { id } = Route.useParams();
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [b, setB] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setMeId(user?.id ?? null);
    const { data, error } = await supabase
      .from("bookings")
      .select("id,status,scheduled_at,created_at,total_amount,payment_method,notes,service_id,pro_id,customer_id")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) { setB(null); setLoading(false); return; }
    const [{ data: svc }, { data: pro }] = await Promise.all([
      data.service_id
        ? supabase.from("services").select("name_en,name_ar,duration_mins,category").eq("id", data.service_id).maybeSingle()
        : Promise.resolve({ data: null as Detail["service"] }),
      data.pro_id
        ? supabase.from("users").select("full_name").eq("id", data.pro_id).maybeSingle()
        : Promise.resolve({ data: null as Detail["pro"] }),
    ]);
    setB({ ...data, total_amount: Number(data.total_amount), service: svc, pro });
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const onCancel = async () => {
    if (!b) return;
    if (!confirm(lang === "ar" ? "هل تريد إلغاء الحجز؟" : "Cancel this booking?")) return;
    setCancelling(true);
    const { data, error } = await supabase.rpc("cancel_booking", { p_booking_id: b.id });
    setCancelling(false);
    if (error) { toast.error(error.message); return; }
    const refunded = (data as { refunded?: boolean } | null)?.refunded;
    toast.success(refunded
      ? (lang === "ar" ? "تم الإلغاء واسترداد المبلغ" : "Cancelled and wallet refunded")
      : (lang === "ar" ? "تم إلغاء الحجز" : "Booking cancelled"));
    load();
  };

  const onComplete = async () => {
    if (!b) return;
    if (!confirm(lang === "ar" ? "تأكيد إنجاز الخدمة؟ سيتم تحويل المبلغ من الضمان." : "Mark this job as done? Funds will be released from escrow.")) return;
    setCompleting(true);
    const { error } = await (supabase.rpc as any)("complete_booking", { p_booking_id: b.id });
    setCompleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "ar" ? "تم الإنجاز وتحرير المبلغ" : "Job done · funds released");
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  if (!b) {
    return (
      <div className="px-5 pt-10 text-center space-y-3">
        <div className="text-sm text-muted-foreground">{lang === "ar" ? "الحجز غير موجود" : "Booking not found"}</div>
        <Link to="/bookings" className="text-sm font-semibold text-primary">{lang === "ar" ? "← الحجوزات" : "← Bookings"}</Link>
      </div>
    );
  }

  const proName = b.pro?.full_name ?? (lang === "ar" ? "مزود الخدمة" : "Provider");
  const initial = (proName.trim()[0] ?? "?").toUpperCase();
  const serviceName = (lang === "ar" ? b.service?.name_ar : b.service?.name_en) ?? b.service?.name_en ?? "—";
  const PMIcon = b.payment_method === "wallet" ? Wallet : b.payment_method === "card" ? CreditCard : Banknote;

  return (
    <div className="px-5 pt-6 pb-32 space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate({ to: "/bookings" })} className="spring-tap p-2 -ml-2 rounded-xl">
          <ArrowLeft size={20} className="rtl:rotate-180" />
        </button>
        <StatusBadge status={b.status} />
      </div>

      <div className="glass rounded-3xl p-5 flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
          style={{ background: "var(--gradient-primary)" }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-lg leading-tight truncate">{proName}</div>
          <div className="text-sm text-muted-foreground truncate">{serviceName}</div>
          {b.service?.category && (
            <div className="text-[11px] text-muted-foreground capitalize mt-0.5">{b.service.category}</div>
          )}
        </div>
      </div>

      <div className="glass rounded-3xl divide-y divide-border overflow-hidden">
        <Row icon={<Calendar size={16} />} label={lang === "ar" ? "الموعد" : "When"} value={formatWhen(b.scheduled_at, lang as "en" | "ar")} />
        {b.service?.duration_mins != null && (
          <Row icon={<Clock size={16} />} label={lang === "ar" ? "المدة" : "Duration"} value={`${b.service.duration_mins} min`} />
        )}
        <Row icon={<PMIcon size={16} />} label={lang === "ar" ? "طريقة الدفع" : "Payment"} value={<span className="capitalize">{b.payment_method}</span>} />
        <Row
          icon={<Hash size={16} />}
          label={lang === "ar" ? "رقم المرجع" : "Reference"}
          value={<span className="font-mono">{b.id.slice(0, 8).toUpperCase()}</span>}
        />
      </div>

      <div className="glass-tint rounded-3xl p-5 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{lang === "ar" ? "المبلغ الإجمالي" : "Total"}</div>
        <div className="text-2xl font-bold text-primary">{b.total_amount.toFixed(2)} <span className="text-sm font-medium">JOD</span></div>
      </div>

      {b.notes && (
        <div className="glass rounded-3xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{lang === "ar" ? "ملاحظات" : "Notes"}</div>
          <div className="text-sm">{b.notes}</div>
        </div>
      )}

      {(b.status === "pending" || b.status === "in_escrow") && b.customer_id === meId && (
        <div className="fixed bottom-20 left-0 right-0 px-5">
          <button
            onClick={onCancel}
            disabled={cancelling}
            className="spring-tap w-full rounded-2xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "color-mix(in oklab, var(--color-destructive) 12%, white)", color: "var(--color-destructive)", border: "1px solid color-mix(in oklab, var(--color-destructive) 30%, transparent)" }}
          >
            {cancelling ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
            {lang === "ar" ? "إلغاء الحجز" : "Cancel booking"}
          </button>
        </div>
      )}

      {(b.status === "pending" || b.status === "in_escrow" || b.status === "confirmed") && b.pro_id === meId && (
        <div className="fixed bottom-20 left-0 right-0 px-5">
          <button
            onClick={onComplete}
            disabled={completing}
            className="spring-tap w-full rounded-2xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 text-white"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-float)" }}
          >
            {completing ? <Loader2 size={16} className="animate-spin" /> : "✓"}
            {lang === "ar" ? "إنجاز الخدمة وتحرير المبلغ" : "Mark job done · release funds"}
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="w-9 h-9 rounded-xl bg-primary-tint text-primary flex items-center justify-center">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}
