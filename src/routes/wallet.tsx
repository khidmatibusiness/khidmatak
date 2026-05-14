import { createFileRoute } from "@tanstack/react-router";
import { Plus, Send, Users, ArrowUpRight, ArrowDownLeft, PiggyBank, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { transactions } from "@/lib/mock-data";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Khidmati · Wallet" },
      { name: "description", content: "Top up, transfer and split with the Khidmati escrow-protected wallet." },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const { t } = useI18n();
  const [showCode, setShowCode] = useState(false);
  const balance = 142.75;
  const roundUp = 8.4;
  const roundUpGoal = 20;
  const pct = Math.min(100, (roundUp / roundUpGoal) * 100);

  return (
    <div className="px-5 pt-8 space-y-5 animate-fade-up">
      <h1 className="text-2xl font-bold tracking-tight">{t("wallet")}</h1>

      {/* balance card */}
      <div
        className="rounded-3xl p-5 text-white relative overflow-hidden"
        style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-float)" }}
      >
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/15" />
        <div className="absolute -left-6 -bottom-12 w-40 h-40 rounded-full bg-white/10" />
        <div className="relative">
          <div className="text-xs opacity-90">{t("balance")}</div>
          <div className="text-4xl font-bold tracking-tight mt-1">
            {balance.toFixed(2)} <span className="text-base font-medium opacity-80">JOD</span>
          </div>
          <div className="mt-4 glass-strong rounded-2xl p-3 flex items-center justify-between text-foreground">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("privateCode")}</div>
              <div className="font-mono text-sm font-semibold">{showCode ? "KH-7F2A-91X" : "•••• •••• ••"}</div>
            </div>
            <button onClick={() => setShowCode((v) => !v)} className="spring-tap p-2 rounded-xl bg-primary-tint text-primary">
              {showCode ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Plus size={20} />, label: t("topUp") },
          { icon: <Send size={20} />, label: t("transfer") },
          { icon: <Users size={20} />, label: t("split") },
        ].map((a) => (
          <button key={a.label} className="spring-tap glass rounded-2xl p-3 flex flex-col items-center gap-1.5">
            <span className="rounded-xl bg-primary-tint text-primary p-2">{a.icon}</span>
            <span className="text-xs font-medium">{a.label}</span>
          </button>
        ))}
      </div>

      {/* round up */}
      <div className="glass-tint rounded-3xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary text-primary-foreground p-2.5">
            <PiggyBank size={20} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">{t("roundUp")}</div>
            <div className="text-xs text-muted-foreground">{roundUp.toFixed(2)} / {roundUpGoal} JOD</div>
          </div>
          <button className="spring-tap text-xs font-semibold text-primary">{t("transferToMain")}</button>
        </div>
        <div className="h-2 rounded-full bg-white overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--gradient-primary)" }} />
        </div>
      </div>

      {/* transactions */}
      <div>
        <h2 className="text-sm font-semibold mb-2 px-1">{t("recent")}</h2>
        <div className="glass rounded-3xl divide-y divide-border overflow-hidden">
          {transactions.map((tx) => {
            const credit = tx.amount > 0;
            return (
              <div key={tx.id} className="flex items-center gap-3 p-3.5">
                <div className="text-xl">{tx.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{tx.label}</div>
                  <div className="text-[11px] text-muted-foreground">{tx.date}</div>
                </div>
                <div
                  className="text-sm font-semibold flex items-center gap-1"
                  style={{ color: credit ? "var(--color-primary)" : "var(--color-destructive)" }}
                >
                  {credit ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                  {credit ? "+" : ""}
                  {tx.amount.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
