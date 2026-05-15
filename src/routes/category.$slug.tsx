import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, MapPin, Star, ShieldCheck, ChevronRight, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { ProProfileSheet } from "@/components/ProProfileSheet";
import { MapSheet } from "@/components/MapSheet";

export const Route = createFileRoute("/category/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Khidmati · ${params.slug}` },
      { name: "description", content: `Browse trusted ${params.slug} providers near you in West Amman.` },
    ],
  }),
  component: CategoryPage,
});

interface ServiceRow {
  id: string;
  pro_id: string | null;
  name_en: string;
  name_ar: string | null;
  category: string | null;
  subcategory: string | null;
  price: number;
  duration_mins: number | null;
}

interface ProRow {
  id: string;
  full_name: string | null;
}

const CATEGORY_META: Record<string, { emoji: string; en: string; ar: string }> = {
  home:    { emoji: "🏠", en: "Home services",            ar: "خدمات منزلية" },
  sports:  { emoji: "🎾", en: "Entertainment & sports",   ar: "ترفيه ورياضة" },
  medical: { emoji: "🩺", en: "Medical",                  ar: "طبية" },
  beauty:  { emoji: "💆", en: "Beauty & wellness",        ar: "تجميل وعناية" },
};

const SUBCAT_META: Record<string, { emoji: string; en: string; ar: string; unit: string }> = {
  cleaning: { emoji: "🧼", en: "Cleaning",                ar: "تنظيف",           unit: "/hr" },
  laundry:  { emoji: "🧺", en: "Laundry & dry cleaning",  ar: "غسيل وكي",        unit: "/kg" },
  pest:     { emoji: "🪲", en: "Pest control",            ar: "مكافحة حشرات",    unit: "/visit" },
  painting: { emoji: "🎨", en: "Painting",                ar: "دهان",            unit: "/room" },
  padel:    { emoji: "🎾", en: "Padel courts",            ar: "ملاعب بادل",      unit: "/90 min" },
  football: { emoji: "⚽", en: "Football fields",          ar: "ملاعب كرة قدم",   unit: "/hr" },
  gym:      { emoji: "🏋️", en: "Gym",                      ar: "صالة رياضية",     unit: "/visit" },
  swim:     { emoji: "🏊", en: "Swimming",                ar: "سباحة",           unit: "/visit" },
  tennis:   { emoji: "🎾", en: "Tennis",                  ar: "تنس",             unit: "/hr" },
  dentist:  { emoji: "🦷", en: "Dentists",                ar: "أطباء أسنان",     unit: "/visit" },
  optician: { emoji: "👓", en: "Opticians",               ar: "نظارات",          unit: "/visit" },
  lab:      { emoji: "🧪", en: "Medical labs",            ar: "مختبرات",         unit: "/test" },
  barber:   { emoji: "💈", en: "Barbershops",             ar: "حلاقة رجالية",    unit: "/visit" },
  salon:    { emoji: "💇", en: "Salons",                  ar: "صالونات",         unit: "/visit" },
  hammam:   { emoji: "🛁", en: "Turkish bath",            ar: "حمام تركي",       unit: "/visit" },
  spa:      { emoji: "💆", en: "Spa",                     ar: "سبا",             unit: "/visit" },
};

function subMeta(key: string) {
  return SUBCAT_META[key] ?? { emoji: "✨", en: key, ar: key, unit: "" };
}

function CategoryPage() {
  const { slug } = useParams({ from: "/category/$slug" });
  const { lang } = useI18n();
  const cat = CATEGORY_META[slug];

  const [services, setServices] = useState<ServiceRow[]>([]);
  const [pros, setPros] = useState<Record<string, ProRow>>({});
  const [loading, setLoading] = useState(true);
  const [activeSub, setActiveSub] = useState<string>("");
  const [query, setQuery] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data: svc } = await supabase
        .from("services")
        .select("id, pro_id, name_en, name_ar, category, subcategory, price, duration_mins")
        .eq("category", slug)
        .eq("is_active", true)
        .order("price", { ascending: true });
      const list = (svc ?? []) as ServiceRow[];
      const proIds = Array.from(new Set(list.map((s) => s.pro_id).filter(Boolean) as string[]));
      const proMap: Record<string, ProRow> = {};
      if (proIds.length) {
        const { data: rows } = await supabase
          .from("users")
          .select("id, full_name")
          .in("id", proIds);
        for (const r of (rows ?? []) as ProRow[]) proMap[r.id] = r;
      }
      if (cancelled) return;
      setServices(list);
      setPros(proMap);
      setActiveSub((cur) => cur || list[0]?.subcategory || "");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const subs = useMemo(() => {
    const set = new Map<string, number>();
    for (const s of services) {
      if (!s.subcategory) continue;
      set.set(s.subcategory, (set.get(s.subcategory) ?? 0) + 1);
    }
    return Array.from(set.keys());
  }, [services]);

  const filtered = useMemo(() => {
    return services
      .filter((s) => (activeSub ? s.subcategory === activeSub : true))
      .filter((s) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        const proName = (s.pro_id && pros[s.pro_id]?.full_name) || "";
        return (
          (s.name_en?.toLowerCase().includes(q) ?? false) ||
          (s.name_ar?.toLowerCase().includes(q) ?? false) ||
          proName.toLowerCase().includes(q)
        );
      });
  }, [services, activeSub, query, pros]);

  const minPrice = filtered.length ? Math.min(...filtered.map((s) => Number(s.price))) : 0;
  const sub = activeSub ? subMeta(activeSub) : null;

  if (!cat) {
    return (
      <div className="px-5 pt-10 text-center">
        <p className="text-muted-foreground">Category not found.</p>
        <Link to="/" className="text-primary font-medium">Back to home</Link>
      </div>
    );
  }

  return (
    <div className="px-5 pt-7 space-y-5 animate-fade-up">
      {/* header */}
      <div className="flex items-center gap-3">
        <Link
          to="/"
          aria-label="Back"
          className="spring-tap glass-strong w-11 h-11 rounded-full flex items-center justify-center"
        >
          <ArrowLeft size={18} className="rtl:rotate-180" />
        </Link>
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
            {lang === "ar" ? "التصنيفات" : "Categories"}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-2xl">{cat.emoji}</span>
            <h1 className="text-2xl font-bold tracking-tight">{lang === "ar" ? cat.ar : cat.en}</h1>
          </div>
        </div>
      </div>

      {/* search */}
      <div className="glass rounded-full flex items-center gap-2 px-5 py-3.5">
        <Search size={18} className="text-muted-foreground shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={lang === "ar" ? "ابحث…" : "Search providers…"}
          className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted-foreground min-w-0"
        />
      </div>

      {/* sub-tabs */}
      {subs.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
          {subs.map((key) => {
            const active = key === activeSub;
            const m = subMeta(key);
            return (
              <button
                key={key}
                onClick={() => setActiveSub(key)}
                className="spring-tap shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold flex items-center gap-2 border transition-colors"
                style={{
                  background: active ? "var(--color-primary)" : "white",
                  color: active ? "white" : "var(--color-foreground)",
                  borderColor: active ? "var(--color-primary)" : "var(--color-border)",
                  boxShadow: active ? "var(--shadow-glass)" : "none",
                }}
              >
                <span className="text-base leading-none">{m.emoji}</span>
                <span className="whitespace-nowrap">{lang === "ar" ? m.ar : m.en}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* count */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-base font-bold">
            {filtered.length} {lang === "ar" ? "مزود قريب" : "providers nearby"}
          </div>
          {sub && filtered.length > 0 && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {lang === "ar" ? "ابتداءً من" : "From"}{" "}
              <span className="font-bold text-primary">{minPrice} JOD</span> {sub.unit}
            </div>
          )}
        </div>
        <button
          onClick={() => setMapOpen(true)}
          className="spring-tap rounded-full px-3.5 py-1.5 text-sm font-medium flex items-center gap-1.5"
          style={{ background: "var(--color-primary-tint)", color: "var(--color-primary)" }}
        >
          <MapPin size={14} /> {lang === "ar" ? "عرض الخريطة" : "View on map"}
        </button>
      </div>

      {/* list */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const proName = (s.pro_id && pros[s.pro_id]?.full_name) || s.name_en;
            const m = s.subcategory ? subMeta(s.subcategory) : { emoji: "✨", unit: "" };
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setProfileId(s.id)}
                className="spring-tap w-full glass rounded-3xl p-3 flex items-center gap-3 text-start"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                  style={{ background: "color-mix(in oklab, var(--color-primary) 8%, white)" }}
                >
                  {m.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="font-bold text-base truncate">{proName}</div>
                    <ShieldCheck size={15} className="text-primary shrink-0" />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <Star size={13} className="fill-gold text-gold" />
                    <span className="font-bold text-foreground">—</span>
                    <span>·</span>
                    <span className="truncate">
                      {lang === "ar" ? (s.name_ar ?? s.name_en) : s.name_en}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-primary mt-1">
                    {Number(s.price).toFixed(0)} JOD
                    <span className="font-medium text-muted-foreground">{m.unit}</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-muted-foreground rtl:rotate-180" />
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-10">
              {lang === "ar" ? "لا يوجد مزودون مطابقون." : "No providers match your search."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
