import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, MapPin, Sparkles, Crown, ArrowRight, Siren } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { services } from "@/lib/mock-data";
import { HamburgerMenu } from "@/components/HamburgerMenu";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Khidmati · Home" },
      { name: "description", content: "Book trusted home, sports, medical and beauty services across West Amman." },
    ],
  }),
  component: HomePage,
});

const categories = [
  { key: "catHome" as const, emoji: "🏠", id: "home" },
  { key: "catSports" as const, emoji: "⚽", id: "sports" },
  { key: "catMedical" as const, emoji: "🩺", id: "medical" },
  { key: "catBeauty" as const, emoji: "💅", id: "beauty" },
];

function HomePage() {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("home");
  const [sosOpen, setSosOpen] = useState(false);

  const filtered = services.filter((s) =>
    query.trim()
      ? s.name[lang].toLowerCase().includes(query.toLowerCase()) ||
        s.provider.toLowerCase().includes(query.toLowerCase())
      : true,
  );

  return (
    <div className="px-5 pt-6 space-y-6 animate-fade-up">
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">{t("hello")}, Lara 👋</div>
          <div className="flex items-center gap-1.5 mt-1 text-sm font-medium">
            <MapPin size={14} className="text-primary" />
            {t("westAmman")}
          </div>
        </div>
        <HamburgerMenu />
      </div>

      {/* search */}
      <div className="glass rounded-2xl flex items-center gap-2 px-4 py-3">
        <Search size={18} className="text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted-foreground"
        />
      </div>

      {/* SOS */}
      <button
        onClick={() => setSosOpen((v) => !v)}
        className="spring-tap w-full rounded-3xl px-5 py-4 text-white flex items-center gap-3 animate-pulse-ring"
        style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 22), oklch(0.55 0.24 18))" }}
      >
        <div className="rounded-2xl bg-white/20 p-2.5">
          <Siren size={22} />
        </div>
        <div className="text-start flex-1">
          <div className="font-semibold text-base">{t("sos")}</div>
          <div className="text-xs opacity-90">{t("sosSub")}</div>
        </div>
        <ArrowRight size={20} className="rtl:rotate-180" />
      </button>

      {sosOpen && (
        <div className="glass-tint rounded-3xl p-4 grid grid-cols-2 gap-2 animate-fade-up">
          {[
            { e: "🔧", l: "Plumber" },
            { e: "⚡", l: "Electrician" },
            { e: "🚗", l: "Tow truck" },
            { e: "🩹", l: "First aid" },
          ].map((x) => (
            <button key={x.l} className="spring-tap glass rounded-2xl p-3 text-sm font-medium flex items-center gap-2">
              <span className="text-xl">{x.e}</span> {x.l}
            </button>
          ))}
        </div>
      )}

      {/* categories */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {categories.map((c) => {
          const active = activeCat === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className="spring-tap shrink-0 rounded-full px-4 py-2 text-sm font-medium flex items-center gap-1.5 border"
              style={{
                background: active ? "var(--color-primary)" : "white",
                color: active ? "white" : "var(--color-foreground)",
                borderColor: active ? "var(--color-primary)" : "var(--color-border)",
              }}
            >
              <span>{c.emoji}</span>
              {t(c.key)}
            </button>
          );
        })}
      </div>

      {/* near you */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("nearYou")}</h2>
          <button className="text-xs font-medium text-primary">{t("seeAll")}</button>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
          {filtered.map((s) => (
            <div key={s.id} className="shrink-0 w-44 glass rounded-3xl p-4 spring-tap">
              <div className="text-3xl mb-2">{s.emoji}</div>
              <div className="font-semibold text-sm leading-tight">{s.name[lang]}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.provider}</div>
              <div className="flex items-center justify-between mt-3 text-xs">
                <span className="flex items-center gap-1">⭐ {s.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">{s.distanceKm} km</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Concierge */}
      <div className="rounded-3xl p-5 text-white relative overflow-hidden" style={{ background: "var(--gradient-primary)" }}>
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-20" style={{ background: "white" }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={18} />
            <div className="font-semibold">{t("conciergeTitle")}</div>
          </div>
          <div className="glass-strong rounded-2xl px-4 py-3 flex items-center gap-2 text-foreground">
            <input
              placeholder={t("conciergePh")}
              className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted-foreground"
            />
            <button className="spring-tap rounded-xl bg-primary text-white p-1.5">
              <ArrowRight size={16} className="rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>

      {/* Gold */}
      <div className="rounded-3xl p-4 flex items-center gap-3" style={{ background: "var(--gradient-gold)" }}>
        <div className="rounded-2xl bg-white/30 p-2.5 text-white">
          <Crown size={22} />
        </div>
        <div className="flex-1 text-white">
          <div className="font-semibold">{t("goldTitle")}</div>
          <div className="text-xs opacity-90 leading-tight">{t("goldSub")}</div>
        </div>
        <button className="spring-tap rounded-full bg-white text-foreground text-xs font-semibold px-3 py-2">
          {t("upgrade")}
        </button>
      </div>
    </div>
  );
}
