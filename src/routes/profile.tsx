import { createFileRoute } from "@tanstack/react-router";
import { Crown, Settings, LogOut, ChevronRight, Languages, Copy } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Khidmati · Profile" },
      { name: "description", content: "Manage your Khidmati account, language and Private Code." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t, lang, setLang } = useI18n();
  const code = "KH-7F2A-91X";

  return (
    <div className="px-5 pt-8 space-y-5 animate-fade-up">
      <h1 className="text-2xl font-bold tracking-tight">{t("profile")}</h1>

      <div className="glass rounded-3xl p-5 flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
          style={{ background: "var(--gradient-primary)" }}
        >
          L
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-lg leading-tight">Lara Haddad</div>
          <div className="inline-flex items-center gap-1 text-[11px] mt-1 px-2 py-0.5 rounded-full text-white" style={{ background: "var(--gradient-gold)" }}>
            <Crown size={11} /> {t("goldMember")}
          </div>
        </div>
      </div>

      <div className="glass-tint rounded-3xl p-4 flex items-center gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("privateCode")}</div>
          <div className="font-mono font-semibold">{code}</div>
        </div>
        <button className="spring-tap ml-auto rounded-xl bg-white p-2 text-primary">
          <Copy size={16} />
        </button>
      </div>

      {/* language toggle */}
      <div className="glass rounded-3xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-xl bg-primary-tint text-primary p-2"><Languages size={18} /></div>
          <div className="flex-1 text-sm font-medium">{t("language")}</div>
        </div>
        <div className="flex gap-2">
          {(["en", "ar"] as const).map((l) => {
            const active = lang === l;
            return (
              <button
                key={l}
                onClick={() => setLang(l)}
                className="spring-tap flex-1 rounded-2xl py-2.5 text-sm font-semibold border"
                style={{
                  background: active ? "var(--color-primary)" : "white",
                  color: active ? "white" : "var(--color-foreground)",
                  borderColor: active ? "var(--color-primary)" : "var(--color-border)",
                }}
              >
                {l === "en" ? "English" : "العربية"}
              </button>
            );
          })}
        </div>
      </div>

      <div className="glass rounded-3xl divide-y divide-border overflow-hidden">
        {[
          { icon: <Settings size={18} />, label: t("settings") },
          { icon: <Crown size={18} />, label: t("goldTitle") },
          { icon: <LogOut size={18} />, label: t("logout"), danger: true },
        ].map((row) => (
          <button
            key={row.label}
            className="spring-tap w-full flex items-center gap-3 p-4 text-start hover:bg-primary-tint"
          >
            <span className={row.danger ? "text-destructive" : "text-primary"}>{row.icon}</span>
            <span className={`flex-1 text-sm font-medium ${row.danger ? "text-destructive" : ""}`}>{row.label}</span>
            <ChevronRight size={16} className="text-muted-foreground rtl:rotate-180" />
          </button>
        ))}
      </div>
    </div>
  );
}
