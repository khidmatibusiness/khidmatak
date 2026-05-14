import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, MapPin, Sparkles, Crown, ChevronRight, Siren, Heart, Star, Loader2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { SosSheet } from "@/components/SosSheet";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SUBCAT_EMOJI: Record<string, string> = {
  cleaning: "🧼", laundry: "🧺", pest: "🪲", painting: "🎨",
  padel: "🎾", football: "⚽", gym: "🏋️", swim: "🏊", tennis: "🎾",
  dentist: "🦷", optician: "👓", lab: "🧪",
  barber: "💈", salon: "💇", hammam: "🛁", spa: "💆",
};
const CATEGORY_TINT: Record<string, string> = {
  home: "oklch(0.97 0.025 158)",
  sports: "oklch(0.97 0.05 110)",
  medical: "oklch(0.97 0.025 230)",
  beauty: "oklch(0.97 0.03 20)",
};

interface NearbyService {
  id: string;
  name_en: string;
  name_ar: string | null;
  category: string | null;
  subcategory: string | null;
  price: number;
  pro_id: string | null;
  pro_name: string;
}

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
  { id: "home", label: { en: "Home", ar: "منزل" }, emoji: "🏠", tint: "linear-gradient(160deg, oklch(0.96 0.05 158), oklch(0.99 0.02 158))" },
  { id: "sports", label: { en: "Sports", ar: "رياضة" }, emoji: "🎾", tint: "linear-gradient(160deg, oklch(0.96 0.09 110), oklch(0.99 0.03 110))" },
  { id: "medical", label: { en: "Medical", ar: "طبية" }, emoji: "🩺", tint: "linear-gradient(160deg, oklch(0.95 0.05 230), oklch(0.99 0.02 230))" },
  { id: "beauty", label: { en: "Beauty", ar: "تجميل" }, emoji: "💆", tint: "linear-gradient(160deg, oklch(0.95 0.05 20), oklch(0.99 0.02 20))" },
];

function HomePage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [sosOpen, setSosOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [nearby, setNearby] = useState<NearbyService[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: svc } = await supabase
        .from("services")
        .select("id, name_en, name_ar, category, subcategory, price, pro_id")
        .eq("is_active", true)
        .order("price", { ascending: true })
        .limit(8);
      const list = (svc ?? []) as Array<Omit<NearbyService, "pro_name">>;
      const proIds = Array.from(new Set(list.map((s) => s.pro_id).filter(Boolean) as string[]));
      const proMap: Record<string, string> = {};
      if (proIds.length) {
        const { data: pros } = await supabase
          .from("users").select("id, full_name").in("id", proIds);
        for (const p of (pros ?? []) as Array<{ id: string; full_name: string | null }>) {
          if (p.full_name) proMap[p.id] = p.full_name;
        }
      }
      if (cancelled) return;
      setNearby(
        list.map((s) => ({
          ...s,
          pro_name: (s.pro_id && proMap[s.pro_id]) || s.name_en,
        })),
      );
      setNearbyLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const toggleFav = (id: string) =>
    setFavs((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const q = query.trim().toLowerCase();
  const filteredNearby = q
    ? nearby.filter((s) =>
        [s.name_en, s.name_ar ?? "", s.pro_name, s.category ?? "", s.subcategory ?? ""]
          .some((v) => v.toLowerCase().includes(q)),
      )
    : nearby;


  return (
    <div className="px-5 pt-7 space-y-6 animate-fade-up">
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Good evening</div>
          <div className="text-2xl font-bold tracking-tight mt-0.5">Hi, Ali 👋</div>
          <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
            <MapPin size={14} className="text-primary" />
            {t("westAmman")}
          </div>
        </div>
        <div className="flex items-center gap-2.5 pt-1">
          <button
            onClick={() => setSosOpen(true)}
            aria-label="SOS"
            className="spring-tap relative w-12 h-12 rounded-full flex items-center justify-center text-white animate-pulse-ring"
            style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 22), oklch(0.55 0.24 18))" }}
          >
            <Siren size={20} />
          </button>
          <HamburgerMenu />
        </div>
      </div>

      {/* search + Ask AI */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // Normal search just filters in place — already reactive
        }}
        className="glass rounded-full flex items-center gap-2 pl-5 pr-1.5 py-1.5"
      >
        <Search size={18} className="text-muted-foreground shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted-foreground py-2 min-w-0"
        />
        <button
          type="button"
          onClick={() => setAiOpen(true)}
          className="spring-tap shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold flex items-center gap-1.5"
          style={{ background: "var(--color-primary-tint)", color: "var(--color-primary)" }}
        >
          <Sparkles size={15} />
          Ask AI
        </button>
      </form>

      {/* Categories */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Categories</h2>
          <button
            onClick={() => toast("All categories — coming soon")}
            className="text-sm font-medium text-primary flex items-center gap-0.5"
          >
            See all <ChevronRight size={16} className="rtl:rotate-180" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/category/$slug"
              params={{ slug: c.id }}
              className="spring-tap text-start rounded-3xl p-4 h-40 flex flex-col justify-between border border-white"
              style={{ background: c.tint, boxShadow: "var(--shadow-soft)" }}
            >
              <div className="text-5xl leading-none">{c.emoji}</div>
              <div>
                <div className="font-bold text-base">{c.label[lang]}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5">
                  Browse <ChevronRight size={12} className="rtl:rotate-180" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Near you */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Near you</h2>
          <Link
            to="/map"
            className="spring-tap rounded-full px-3.5 py-1.5 text-sm font-medium flex items-center gap-1.5"
            style={{ background: "var(--color-primary-tint)", color: "var(--color-primary)" }}
          >
            <MapPin size={14} /> View on map
          </Link>
        </div>
        {nearbyLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="animate-spin text-primary" size={20} />
          </div>
        ) : filteredNearby.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            {lang === "ar" ? "لا توجد خدمات قريبة بعد." : "No nearby services yet."}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1 snap-x snap-mandatory">
            {filteredNearby.map((s) => {
              const fav = favs.has(s.id);
              const emoji = (s.subcategory && SUBCAT_EMOJI[s.subcategory]) || "✨";
              const tint = (s.category && CATEGORY_TINT[s.category]) || "oklch(0.97 0.025 158)";
              const displayName = lang === "ar" ? (s.name_ar ?? s.name_en) : s.name_en;
              return (
                <Link
                  key={s.id}
                  to="/pro/$id"
                  params={{ id: s.id }}
                  className="spring-tap shrink-0 w-44 snap-start rounded-3xl bg-white p-3 border border-border text-start"
                  style={{ boxShadow: "var(--shadow-soft)" }}
                >
                  <div
                    className="relative rounded-2xl h-24 flex items-center justify-center mb-3"
                    style={{ background: tint }}
                  >
                    <span className="text-4xl">{emoji}</span>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFav(s.id); }}
                      aria-label="Favourite"
                      className="spring-tap absolute top-2 end-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center"
                    >
                      <Heart size={14} className={fav ? "fill-destructive text-destructive" : "text-muted-foreground"} />
                    </button>
                  </div>
                  <div className="font-semibold text-sm leading-tight truncate">{s.pro_name}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Star size={12} className="fill-gold text-gold" />
                    <span className="font-semibold text-foreground">—</span>
                    <span>·</span>
                    <span className="truncate">{displayName}</span>
                  </div>
                  <div className="text-xs font-semibold text-primary mt-1.5">{Number(s.price).toFixed(0)} JOD</div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Khidmati Gold */}
      <div
        className="rounded-3xl p-5 flex items-center gap-3 text-white"
        style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-float)" }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Crown size={18} />
            <div className="font-bold text-lg">{t("goldTitle")}</div>
          </div>
          <div className="text-xs leading-snug opacity-95">
            Priority booking, exclusive deals, faster SOS
          </div>
        </div>
        <button
          onClick={() => toast.success("Khidmati Gold trial activated")}
          className="spring-tap rounded-full bg-white text-foreground text-sm font-semibold px-5 py-2.5"
        >
          {t("upgrade")}
        </button>
      </div>

      {/* SOS sheet (pop-out) */}
      <SosSheet open={sosOpen} onClose={() => setSosOpen(false)} />

      {/* Ask AI suggestions sheet */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fade-up" onClick={() => setAiOpen(false)}>
          <div
            className="bg-white w-full max-w-md rounded-t-3xl p-5 pb-8 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: "var(--shadow-float)" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <Sparkles size={16} />
                </div>
                <div>
                  <div className="font-bold">AI suggestions</div>
                  <div className="text-[11px] text-muted-foreground">
                    {query.trim() ? `Picks for "${query.trim()}"` : "Top-rated near you"}
                  </div>
                </div>
              </div>
              <button onClick={() => setAiOpen(false)} aria-label="Close" className="text-muted-foreground p-1">
                <X size={20} />
              </button>
            </div>

            {/* quick chips */}
            <div className="flex gap-2 flex-wrap">
              {["plumber", "padel", "barber", "lab test", "AC repair"].map((s) => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  className="spring-tap text-xs rounded-full px-3 py-1.5 bg-primary-tint text-primary font-medium"
                  style={{ background: "var(--color-primary-tint)", color: "var(--color-primary)" }}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {(filteredNearby.length ? filteredNearby : nearby).slice(0, 8).map((s) => {
                const emoji = (s.subcategory && SUBCAT_EMOJI[s.subcategory]) || "✨";
                const displayName = lang === "ar" ? (s.name_ar ?? s.name_en) : s.name_en;
                return (
                  <Link
                    key={s.id}
                    to="/pro/$id"
                    params={{ id: s.id }}
                    onClick={() => setAiOpen(false)}
                    className="spring-tap glass rounded-2xl p-3 flex items-center gap-3"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ background: "var(--color-primary-tint)" }}
                    >
                      {emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{s.pro_name}</div>
                      <div className="text-[11px] text-muted-foreground truncate capitalize">
                        {s.category ?? "Service"} · {displayName}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-primary shrink-0">{Number(s.price).toFixed(0)} JOD</div>
                  </Link>
                );
              })}
              {nearby.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-6">No services available.</div>
              )}
            </div>

            <button
              onClick={() => {
                setAiOpen(false);
                navigate({ to: "/concierge", search: query.trim() ? { q: query.trim() } : {} });
              }}
              className="spring-tap w-full rounded-full py-3 text-sm font-semibold text-white"
              style={{ background: "var(--gradient-primary)" }}
            >
              Chat with AI Concierge instead
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
