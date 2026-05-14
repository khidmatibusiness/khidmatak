import { createFileRoute, Link } from "@tanstack/react-router";
import { Crown, Settings, LogOut, ChevronRight, Languages, Copy } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

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

  const copyCode = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(code);
      }
      toast.success("Private code copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <div className="px-5 pt-8 space-y-5 animate-fade-up">
      <h1 className="text-2xl font-bold tracking-tight">{t("profile")}</h1>

      {/* combined profile card: name + private code */}
      <div className="glass rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-4">
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
        <div className="rounded-2xl bg-primary-tint p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("privateCode")}</div>
            <div className="font-mono font-semibold">{code}</div>
          </div>
          <button onClick={copyCode} className="spring-tap rounded-xl bg-white p-2 text-primary">
            <Copy size={16} />
          </button>
        </div>
      </div>

      {/* settings menu: language · gold · settings */}
      <div className="glass rounded-3xl divide-y divide-border overflow-hidden">
        <button
          onClick={() => setLang(lang === "en" ? "ar" : "en")}
          className="spring-tap w-full flex items-center gap-3 p-4 text-start hover:bg-primary-tint"
        >
          <span className="text-primary"><Languages size={18} /></span>
          <span className="flex-1 text-sm font-medium">{t("language")}</span>
          <span className="text-xs font-semibold text-muted-foreground">
            {lang === "en" ? "English" : "العربية"}
          </span>
          <ChevronRight size={16} className="text-muted-foreground rtl:rotate-180" />
        </button>

        <button
          onClick={() => toast("Khidmati Gold details coming soon")}
          className="spring-tap w-full flex items-center gap-3 p-4 text-start hover:bg-primary-tint"
        >
          <span className="text-primary"><Crown size={18} /></span>
          <span className="flex-1 text-sm font-medium">{t("goldTitle")}</span>
          <ChevronRight size={16} className="text-muted-foreground rtl:rotate-180" />
        </button>

        <button
          onClick={() => toast("Settings coming soon")}
          className="spring-tap w-full flex items-center gap-3 p-4 text-start hover:bg-primary-tint"
        >
          <span className="text-primary"><Settings size={18} /></span>
          <span className="flex-1 text-sm font-medium">{t("settings")}</span>
          <ChevronRight size={16} className="text-muted-foreground rtl:rotate-180" />
        </button>
      </div>

      {/* logout separated */}
      <Link
        to="/welcome"
        onClick={() => toast.success("Logged out")}
        className="spring-tap glass rounded-3xl p-4 w-full flex items-center gap-3 text-destructive"
      >
        <LogOut size={18} />
        <span className="flex-1 text-sm font-semibold">{t("logout")}</span>
        <ChevronRight size={16} className="rtl:rotate-180" />
      </Link>
    </div>
  );
}
