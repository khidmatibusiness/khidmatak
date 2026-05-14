import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, MapPin, Sparkles, Crown, ChevronRight, Siren, Heart, Star, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { HamburgerMenu } from "@/components/HamburgerMenu";
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

const nearYou = [
  { id: "n1", name: { en: "Biolab Amman", ar: "بايولاب عمّان" }, emoji: "🧪", rating: 4.8, distance: "219 m", price: 12, tint: "oklch(0.97 0.025 158)" },
  { id: "n2", name: { en: "Classic Barber", ar: "كلاسيك باربر" }, emoji: "💈", rating: 4.8, distance: "219 m", price: 8, tint: "oklch(0.97 0.025 158)" },
  { id: "n3", name: { en: "Padel Republic", ar: "بادل ريبابليك" }, emoji: "🎾", rating: 4.9, distance: "1.2 km", price: 24, tint: "oklch(0.97 0.05 110)" },
  { id: "n4", name: { en: "Glow Salon", ar: "صالون جلو" }, emoji: "💇", rating: 4.7, distance: "900 m", price: 18, tint: "oklch(0.97 0.03 20)" },
];

function HomePage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [sosOpen, setSosOpen] = useState(false);
  const [favs, setFavs] = useState<Set<string>>(new Set());

  const toggleFav = (id: string) =>
    setFavs((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

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
            onClick={() => setSosOpen((v) => !v)}
            aria-label="SOS"
            className="spring-tap relative w-12 h-12 rounded-full flex items-center justify-center text-white animate-pulse-ring"
            style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 22), oklch(0.55 0.24 18))" }}
          >
            <Siren size={20} />
          </button>
          <HamburgerMenu />
        </div>
      </div>

      {/* SOS quick-pick sheet */}
      {sosOpen && (
        <div className="glass-tint rounded-3xl p-4 grid grid-cols-2 gap-2 animate-fade-up">
          {[
            { e: "🔧", l: "Plumber" },
            { e: "⚡", l: "Electrician" },
            { e: "🚗", l: "Tow truck" },
            { e: "🩹", l: "First aid" },
          ].map((x) => (
            <button
              key={x.l}
              onClick={() => { toast.success(`${x.l} dispatched — ETA 12 min`); setSosOpen(false); }}
              className="spring-tap glass rounded-2xl p-3 text-sm font-medium flex items-center gap-2"
            >
              <span className="text-xl">{x.e}</span> {x.l}
            </button>
          ))}
        </div>
      )}

      {/* search + Ask AI */}
      <div className="glass rounded-full flex items-center gap-2 pl-5 pr-1.5 py-1.5">
        <Search size={18} className="text-muted-foreground shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted-foreground py-2 min-w-0"
        />
        <button
          onClick={() => navigate({ to: "/concierge", search: query.trim() ? { q: query.trim() } : {} })}
          className="spring-tap shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold flex items-center gap-1.5"
          style={{ background: "var(--color-primary-tint)", color: "var(--color-primary)" }}
        >
          <Sparkles size={15} />
          Ask AI
        </button>
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
            onClick={() => toast("Map view — coming soon")}
            className="spring-tap rounded-full px-3.5 py-1.5 text-sm font-medium flex items-center gap-1.5"
            style={{ background: "var(--color-primary-tint)", color: "var(--color-primary)" }}
          >
            <MapPin size={14} /> View on map
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1 snap-x snap-mandatory">
          {nearYou.map((s) => {
            const fav = favs.has(s.id);
            return (
              <div
                key={s.id}
                className="shrink-0 w-44 snap-start rounded-3xl bg-white p-3 border border-border"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                <div
                  className="relative rounded-2xl h-24 flex items-center justify-center mb-3"
                  style={{ background: s.tint }}
                >
                  <span className="text-4xl">{s.emoji}</span>
                  <button
                    onClick={() => toggleFav(s.id)}
                    aria-label="Favourite"
                    className="spring-tap absolute top-2 end-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center"
                  >
                    <Heart size={14} className={fav ? "fill-destructive text-destructive" : "text-muted-foreground"} />
                  </button>
                </div>
                <div className="font-semibold text-sm leading-tight truncate">{s.name[lang]}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Star size={12} className="fill-gold text-gold" />
                  <span className="font-semibold text-foreground">{s.rating.toFixed(1)}</span>
                  <span>·</span>
                  <span>{s.distance}</span>
                </div>
                <div className="text-xs font-semibold text-primary mt-1.5">{s.price} JOD/visit</div>
              </div>
            );
          })}
        </div>
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
    </div>
  );
}
