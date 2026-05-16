import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, MapPin, Sparkles, Crown, ChevronRight, Siren, Heart, Star, Loader2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { SosSheet } from "@/components/SosSheet";
import { MapSheet } from "@/components/MapSheet";
import { ProProfileSheet } from "@/components/ProProfileSheet";
import { ConciergeSheet } from "@/components/ConciergeSheet";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getFavs, toggleFav as toggleFavStore } from "@/lib/favs";

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
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("khidmati_launched")) {
      throw redirect({ to: "/welcome" });
    }
  },
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
  const [searchResults, setSearchResults] = useState<NearbyService[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInitial, setAiInitial] = useState<string | undefined>(undefined);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [nearby, setNearby] = useState<NearbyService[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(true);

  useEffect(() => {
    const sync = () => setFavs(new Set(getFavs()));
    sync();
    window.addEventListener("khidmati:favs", sync);
    return () => window.removeEventListener("khidmati:favs", sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: svc } = await supabase
        .from("services")
        .select("id, name_en, name_ar, category, subcategory, price, pro_id")
        .eq("is_active", true)
        .order("price", { ascending: true })
        .limit(200);
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

  // Live search against Supabase
  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setSearchResults([]);
      setSearchOpen(false);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    setSearchOpen(true);
    const handle = setTimeout(async () => {
      const escaped = term.replace(/[%,]/g, " ");
      const { data: svc } = await supabase
        .from("services")
        .select("id, name_en, name_ar, category, subcategory, price, pro_id")
        .eq("is_active", true)
        .or(`name_en.ilike.%${escaped}%,name_ar.ilike.%${escaped}%,subcategory.ilike.%${escaped}%,category.ilike.%${escaped}%`)
        .limit(15);
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
      setSearchResults(
        list.map((s) => ({ ...s, pro_name: (s.pro_id && proMap[s.pro_id]) || s.name_en })),
      );
      setSearchLoading(false);
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  const toggleFav = (id: string) => setFavs(new Set(toggleFavStore(id)));

  const q = query.trim().toLowerCase();
  const normalizeQuery = (value: string) => value.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, " ").trim();
  const typoAliases: Record<string, string> = {
    padl: "padel",
    paddel: "padel",
    badel: "padel",
    jds: "",
    jd: "",
    jod: "",
    dinar: "",
    dinars: "",
  };
  const expandSearchText = (value: string) => {
    const normalized = normalizeQuery(value);
    const expandedWords = normalized
      .split(" ")
      .filter(Boolean)
      .map((word) => typoAliases[word] ?? word)
      .filter(Boolean);
    return expandedWords.join(" ") || normalized;
  };
  // parse budget: "under 30", "below 25", "30 jds", "<= 20", "for 30"
  const budgetMatch = q.match(/(?:under|below|less than|<=?|for|at|max)\s*(\d+)|(\d+)\s*(?:jod|jds|jd|dinar)/);
  const budget = budgetMatch ? Number(budgetMatch[1] ?? budgetMatch[2]) : null;
  const FUN_KEYWORDS = ["fun", "activity", "activities", "play", "entertain", "near me", "something to do"];
  const isFun = FUN_KEYWORDS.some((k) => q.includes(k));
  const FUN_SUBCATS = new Set(["padel", "football", "tennis", "swim", "gym", "spa", "hammam", "salon"]);

  const filteredNearby = q
    ? nearby.filter((s) => {
        if (budget !== null && Number(s.price) > budget) return false;
        if (isFun && s.subcategory && FUN_SUBCATS.has(s.subcategory)) return true;
        const stripped = expandSearchText(
          q
            .replace(budgetMatch?.[0] ?? "", "")
            .replace(/\b(for|under|below|less than|at|max|jod|jds|jd|dinar|dinars|near me)\b/g, " "),
        );
        if (!stripped) return budget !== null ? true : isFun;
        const searchTokens = stripped.split(" ").filter(Boolean);
        return [s.name_en, s.name_ar ?? "", s.pro_name, s.category ?? "", s.subcategory ?? ""]
          .some((v) => {
            const value = expandSearchText(v);
            return searchTokens.every((token) => value.includes(token));
          });
      })
    : nearby.slice(0, 8);


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
      <div className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
        className="glass rounded-full flex items-center gap-2 pl-5 pr-1.5 py-1.5"
      >
        <Search size={18} className="text-muted-foreground shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (query.trim()) setSearchOpen(true); }}
          onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
          placeholder={t("searchPlaceholder")}
          className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted-foreground py-2 min-w-0"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setSearchResults([]); setSearchOpen(false); }}
            aria-label="Clear"
            className="shrink-0 text-muted-foreground p-1"
          >
            <X size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setAiInitial(query.trim() || undefined);
            setAiOpen(true);
          }}
          className="spring-tap shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold flex items-center gap-1.5"
          style={{ background: "var(--color-primary-tint)", color: "var(--color-primary)" }}
        >
          <Sparkles size={15} />
          Ask AI
        </button>
      </form>
      {searchOpen && query.trim() && (
        <div
          className="absolute left-0 right-0 top-full mt-2 z-40 bg-white rounded-2xl border border-border max-h-80 overflow-y-auto"
          style={{ boxShadow: "var(--shadow-float)" }}
        >
          {searchLoading ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="animate-spin text-primary" size={18} />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {lang === "ar" ? "لا توجد نتائج" : "No results"}
            </div>
          ) : (
            <ul className="py-1">
              {searchResults.map((s) => {
                const emoji = (s.subcategory && SUBCAT_EMOJI[s.subcategory]) || "✨";
                const displayName = lang === "ar" ? (s.name_ar ?? s.name_en) : s.name_en;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearchOpen(false);
                        setProfileId(s.id);
                      }}
                      className="w-full text-start flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                        style={{ background: "var(--color-primary-tint)" }}
                      >
                        {emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{displayName}</div>
                        <div className="text-[11px] text-muted-foreground truncate capitalize">
                          {s.pro_name} · {s.category ?? "service"}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-primary shrink-0">{Number(s.price).toFixed(0)} JOD</div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      </div>

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
          <button
            onClick={() => setMapOpen(true)}
            className="spring-tap rounded-full px-3.5 py-1.5 text-sm font-medium flex items-center gap-1.5"
            style={{ background: "var(--color-primary-tint)", color: "var(--color-primary)" }}
          >
            <MapPin size={14} /> View on map
          </button>
        </div>
        {nearbyLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="animate-spin text-primary" size={20} />
          </div>
        ) : filteredNearby.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            {q
              ? lang === "ar"
                ? "ما لقينا خدمات تطابق بحثك. جرّب كلمات ثانية."
                : "No services match your search. Try another keyword."
              : lang === "ar"
                ? "لا توجد خدمات قريبة بعد."
                : "No nearby services yet."}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1 snap-x snap-mandatory">
            {filteredNearby.map((s) => {
              const fav = favs.has(s.id);
              const emoji = (s.subcategory && SUBCAT_EMOJI[s.subcategory]) || "✨";
              const tint = (s.category && CATEGORY_TINT[s.category]) || "oklch(0.97 0.025 158)";
              const displayName = lang === "ar" ? (s.name_ar ?? s.name_en) : s.name_en;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setProfileId(s.id)}
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
                </button>
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
      <MapSheet open={mapOpen} onClose={() => setMapOpen(false)} onSelectService={(id) => { setMapOpen(false); setProfileId(id); }} />
      <ProProfileSheet serviceId={profileId} open={!!profileId} onClose={() => setProfileId(null)} />

      {/* AI Concierge popup */}
      <ConciergeSheet
        open={aiOpen}
        onClose={() => { setAiOpen(false); setAiInitial(undefined); }}
        initialQuery={aiInitial}
      />
    </div>
  );
}
