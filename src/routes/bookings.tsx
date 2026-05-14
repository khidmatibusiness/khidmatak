import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { BookingsSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { PullToRefresh } from "@/components/PullToRefresh";
import { haptic } from "@/lib/haptics";

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "Khidmati · Bookings" },
      { name: "description", content: "Track your active and past bookings with escrow-protected payments." },
    ],
  }),
  component: BookingsPage,
});

type BookingStatus = "pending" | "confirmed" | "in_progress" | "done" | "cancelled";

interface BookingRow {
  id: string;
  status: BookingStatus | string | null;
  scheduled_at: string | null;
  created_at: string | null;
  total_amount: number;
  payment_method: string;
  service_id: string | null;
  pro_id: string | null;
  service?: { name_en: string | null; name_ar: string | null } | null;
  pro?: { full_name: string | null } | null;
}

const UPCOMING = ["pending", "confirmed", "in_progress"];
const PAST = ["done", "cancelled"];

export function statusStyle(status: string | null | undefined) {
  switch (status) {
    case "pending":
      return { label: "Pending", bg: "oklch(0.92 0.13 90)", fg: "oklch(0.32 0.12 80)" };
    case "confirmed":
      return { label: "Confirmed", bg: "oklch(0.92 0.08 240)", fg: "oklch(0.32 0.15 245)" };
    case "in_progress":
      return { label: "In progress", bg: "oklch(0.92 0.13 55)", fg: "oklch(0.40 0.18 50)" };
    case "done":
      return { label: "Done", bg: "oklch(0.92 0.13 155)", fg: "oklch(0.36 0.14 155)" };
    case "cancelled":
      return { label: "Cancelled", bg: "oklch(0.93 0.08 25)", fg: "oklch(0.40 0.18 25)" };
    default:
      return { label: status ?? "—", bg: "var(--color-muted)", fg: "var(--color-muted-foreground)" };
  }
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = statusStyle(status);
  return (
    <span
      className="text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

export function formatWhen(scheduled: string | null, lang: "en" | "ar") {
  if (!scheduled) return lang === "ar" ? "الآن" : "ASAP";
  return new Date(scheduled).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BookingsPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Auto-prompt for review when a booking is done and not reviewed/skipped.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("bookings")
        .select("id")
        .eq("customer_id", user.id)
        .eq("status", "done")
        .is("reviewed_at", null)
        .eq("reviewed_skipped", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data?.id) {
        navigate({ to: "/bookings/$id/review", params: { id: data.id } });
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  useEffect(() => {
  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setRows([]); return; }
    const statuses = tab === "upcoming" ? UPCOMING : PAST;
    const { data, error } = await supabase
      .from("bookings")
      .select("id,status,scheduled_at,created_at,total_amount,payment_method,service_id,pro_id")
      .eq("customer_id", user.id)
      .in("status", statuses)
      .order("scheduled_at", { ascending: tab === "upcoming", nullsFirst: tab === "upcoming" })
      .order("created_at", { ascending: false });
    if (error || !data) { setRows([]); return; }

    const serviceIds = Array.from(new Set(data.map((b) => b.service_id).filter(Boolean) as string[]));
    const proIds = Array.from(new Set(data.map((b) => b.pro_id).filter(Boolean) as string[]));
    const [{ data: services }, { data: pros }] = await Promise.all([
      serviceIds.length
        ? supabase.from("services").select("id,name_en,name_ar").in("id", serviceIds)
        : Promise.resolve({ data: [] as { id: string; name_en: string | null; name_ar: string | null }[] }),
      proIds.length
        ? supabase.from("users").select("id,full_name").in("id", proIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    ]);
    const sMap = new Map((services ?? []).map((s) => [s.id, s]));
    const pMap = new Map((pros ?? []).map((p) => [p.id, p]));
    setRows(data.map((b) => ({
      ...b,
      total_amount: Number(b.total_amount),
      service: b.service_id ? sMap.get(b.service_id) ?? null : null,
      pro: b.pro_id ? pMap.get(b.pro_id) ?? null : null,
    })));
  }, [tab]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [load]);

  return (
    <PullToRefresh onRefresh={load}>
    <div className="px-5 pt-8 pb-8 space-y-5 animate-fade-up">
      <h1 className="text-2xl font-bold tracking-tight">{t("bookings")}</h1>

      <div className="glass rounded-2xl p-1 flex">
        {(["upcoming", "past"] as const).map((k) => {
          const active = tab === k;
          return (
            <button
              key={k}
              onClick={() => { haptic("light"); setTab(k); }}
              className="spring-tap flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: active ? "var(--color-primary)" : "transparent",
                color: active ? "white" : "var(--color-muted-foreground)",
              }}
            >
              {k === "upcoming" ? (lang === "ar" ? "القادمة" : "Upcoming") : (lang === "ar" ? "السابقة" : "Past")}
            </button>
          );
        })}
      </div>

      {loading && <BookingsSkeleton />}

      {!loading && rows.length === 0 && (
        <EmptyState
          icon={<CalendarCheck size={22} />}
          title={tab === "upcoming"
            ? (lang === "ar" ? "لا توجد حجوزات قادمة" : "No upcoming bookings")
            : (lang === "ar" ? "لا يوجد سجل حجوزات" : "No past bookings")}
          description={tab === "upcoming"
            ? (lang === "ar" ? "ابدأ بحجز خدمة لتظهر هنا." : "Book a service from the home screen and it will show up here.")
            : (lang === "ar" ? "ستظهر الحجوزات المكتملة والملغاة هنا." : "Completed and cancelled bookings will appear here.")}
          action={
            tab === "upcoming"
              ? <Link to="/" className="spring-tap rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: "var(--gradient-primary)" }}>{lang === "ar" ? "تصفح الخدمات" : "Browse services"}</Link>
              : undefined
          }
        />
      )}

      <div className="space-y-3">
        {rows.map((b) => {
          const proName = b.pro?.full_name ?? (lang === "ar" ? "مزود الخدمة" : "Provider");
          const initial = (proName.trim()[0] ?? "?").toUpperCase();
          const serviceName = (lang === "ar" ? b.service?.name_ar : b.service?.name_en) ?? b.service?.name_en ?? "—";
          return (
            <Link
              to="/bookings/$id"
              params={{ id: b.id }}
              key={b.id}
              className="spring-tap block glass rounded-3xl p-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shrink-0"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-sm leading-tight truncate">{serviceName}</div>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">{proName}</div>
                  <div className="text-xs text-foreground mt-1">{formatWhen(b.scheduled_at, lang as "en" | "ar")}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-muted-foreground capitalize">{b.payment_method}</span>
                    <span className="text-sm font-semibold text-primary">{b.total_amount.toFixed(2)} JOD</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
    </PullToRefresh>
  );
}
