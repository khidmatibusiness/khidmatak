import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Unlock, Users, MapPin, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { bookings, type Booking } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "Khidmati · Bookings" },
      { name: "description", content: "Track your active and past bookings with escrow-protected payments." },
    ],
  }),
  component: BookingsPage,
});

function StatusBadge({ status }: { status: Booking["status"] }) {
  const { t } = useI18n();
  const map = {
    confirmed: { label: t("confirmed"), bg: "var(--color-primary)", fg: "white" },
    pending: { label: t("pending"), bg: "oklch(0.85 0.13 80)", fg: "oklch(0.25 0.05 80)" },
    completed: { label: t("completed"), bg: "var(--color-muted)", fg: "var(--color-muted-foreground)" },
  } as const;
  const s = map[status];
  return (
    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

function BookingsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"active" | "completed">("active");
  const list = bookings.filter((b) => (tab === "active" ? b.status !== "completed" : b.status === "completed"));

  return (
    <div className="px-5 pt-8 space-y-5 animate-fade-up">
      <h1 className="text-2xl font-bold tracking-tight">{t("bookings")}</h1>

      <div className="glass rounded-2xl p-1 flex">
        {(["active", "completed"] as const).map((k) => {
          const active = tab === k;
          return (
            <button
              key={k}
              onClick={() => setTab(k)}
              className="spring-tap flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: active ? "var(--color-primary)" : "transparent",
                color: active ? "white" : "var(--color-muted-foreground)",
              }}
            >
              {t(k)}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {list.map((b) => (
          <div key={b.id} className="glass rounded-3xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="text-3xl">{b.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm leading-tight truncate">{b.service}</div>
                  <StatusBadge status={b.status} />
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{b.provider}</div>
                <div className="text-xs text-foreground mt-1">{b.date}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full"
                style={{
                  background: b.paymentLocked ? "var(--color-primary-tint)" : "var(--color-muted)",
                  color: b.paymentLocked ? "var(--color-primary)" : "var(--color-muted-foreground)",
                }}
              >
                {b.paymentLocked ? <Lock size={12} /> : <Unlock size={12} />}
                {b.paymentLocked ? t("paymentLocked") : t("paymentUnlocked")} · {b.amountJod} JOD
              </span>
              {b.groupSplit && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-accent text-accent-foreground">
                  <Users size={12} />
                  {t("groupSplit")} · {b.groupSplit.members}
                </span>
              )}
            </div>

            {b.status !== "completed" && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => toast.success(`${b.service} cancelled — refund issued`)}
                  className="spring-tap flex-1 rounded-2xl py-2.5 text-sm font-medium border border-border flex items-center justify-center gap-1.5"
                >
                  <X size={15} /> {t("cancel")}
                </button>
                <button
                  onClick={() => toast(`Tracking ${b.provider} — live ETA enabled`)}
                  className="spring-tap flex-1 rounded-2xl py-2.5 text-sm font-semibold bg-primary text-primary-foreground flex items-center justify-center gap-1.5"
                >
                  <MapPin size={15} /> {t("track")}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
