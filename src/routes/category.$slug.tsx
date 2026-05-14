import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Search, MapPin, Star, ShieldCheck, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/category/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Khidmati · ${params.slug}` },
      { name: "description", content: `Browse trusted ${params.slug} providers near you in West Amman.` },
    ],
  }),
  component: CategoryPage,
});

interface Provider {
  id: string;
  name: string;
  emoji: string;
  rating: number;
  reviews: number;
  km: number;
  price: number;
  verified: boolean;
}

interface SubCat {
  id: string;
  label: string;
  emoji: string;
  unit: string; // "/hr", "/visit", "/90 min"
  providers: Provider[];
}

interface Category {
  emoji: string;
  title: string;
  searchPh: string;
  subs: SubCat[];
}

const data: Record<string, Category> = {
  home: {
    emoji: "🏠",
    title: "Home services",
    searchPh: "Search home services...",
    subs: [
      {
        id: "cleaning", label: "Cleaning", emoji: "🧼", unit: "/hr",
        providers: [
          { id: "c1", name: "Sparkle Cleaning", emoji: "🧼", rating: 4.9, reviews: 320, km: 0.8, price: 6, verified: true },
          { id: "c2", name: "Crystal Home", emoji: "✨", rating: 4.7, reviews: 184, km: 1.6, price: 7, verified: true },
        ],
      },
      {
        id: "laundry", label: "Laundry & dry cleaning", emoji: "👕", unit: "/kg",
        providers: [
          { id: "l1", name: "FreshFold", emoji: "🧺", rating: 4.8, reviews: 210, km: 1.1, price: 2, verified: true },
        ],
      },
      {
        id: "pest", label: "Pest control", emoji: "🪲", unit: "/visit",
        providers: [
          { id: "p1", name: "BugAway Pro", emoji: "🛡️", rating: 4.6, reviews: 96, km: 2.4, price: 25, verified: true },
        ],
      },
      {
        id: "painting", label: "Painting", emoji: "🎨", unit: "/room",
        providers: [
          { id: "pa1", name: "ColorWorks", emoji: "🖌️", rating: 4.7, reviews: 142, km: 3.0, price: 45, verified: true },
        ],
      },
    ],
  },
  sports: {
    emoji: "🎾",
    title: "Entertainment & sports",
    searchPh: "Search entertainment & sports...",
    subs: [
      {
        id: "padel", label: "Padel courts", emoji: "🎾", unit: "/90 min",
        providers: [
          { id: "pd1", name: "Padel Pro Court", emoji: "🎾", rating: 4.8, reviews: 410, km: 1.2, price: 25, verified: true },
          { id: "pd2", name: "Smash Padel Club", emoji: "🏓", rating: 4.7, reviews: 220, km: 2.4, price: 22, verified: true },
        ],
      },
      { id: "football", label: "Football fields", emoji: "⚽", unit: "/hr",
        providers: [
          { id: "f1", name: "Goal Arena", emoji: "⚽", rating: 4.6, reviews: 180, km: 3.1, price: 35, verified: true },
        ],
      },
      { id: "gym", label: "Gym", emoji: "🏋️", unit: "/visit",
        providers: [
          { id: "g1", name: "IronHouse Gym", emoji: "🏋️", rating: 4.9, reviews: 540, km: 0.9, price: 10, verified: true },
        ],
      },
      { id: "swim", label: "Swimming", emoji: "🏊", unit: "/visit",
        providers: [{ id: "sw1", name: "AquaClub", emoji: "🏊", rating: 4.7, reviews: 130, km: 2.0, price: 12, verified: true }],
      },
      { id: "tennis", label: "Tennis", emoji: "🎾", unit: "/hr",
        providers: [{ id: "tn1", name: "Ace Tennis", emoji: "🎾", rating: 4.6, reviews: 90, km: 1.8, price: 18, verified: true }],
      },
    ],
  },
  medical: {
    emoji: "🩺",
    title: "Medical",
    searchPh: "Search medical...",
    subs: [
      {
        id: "dentist", label: "Dentists", emoji: "🦷", unit: "/visit",
        providers: [
          { id: "d1", name: "Dr. Karam Dental", emoji: "🦷", rating: 5.0, reviews: 280, km: 1.5, price: 30, verified: true },
          { id: "d2", name: "Smile Studio", emoji: "😁", rating: 4.8, reviews: 190, km: 2.0, price: 28, verified: true },
        ],
      },
      { id: "optician", label: "Opticians", emoji: "👓", unit: "/visit",
        providers: [{ id: "o1", name: "ClearVision", emoji: "👓", rating: 4.7, reviews: 120, km: 1.7, price: 20, verified: true }],
      },
      { id: "lab", label: "Medical labs", emoji: "🧪", unit: "/test",
        providers: [{ id: "lb1", name: "Biolab Amman", emoji: "🧪", rating: 4.8, reviews: 219, km: 0.2, price: 12, verified: true }],
      },
    ],
  },
  beauty: {
    emoji: "💆",
    title: "Beauty & wellness",
    searchPh: "Search beauty & wellness...",
    subs: [
      {
        id: "barber", label: "Barbershops", emoji: "💈", unit: "/visit",
        providers: [
          { id: "b1", name: "Classic Barber", emoji: "💈", rating: 4.8, reviews: 260, km: 0.7, price: 8, verified: true },
          { id: "b2", name: "The Cut Co.", emoji: "✂️", rating: 4.6, reviews: 130, km: 1.5, price: 10, verified: true },
        ],
      },
      { id: "salon", label: "Salons", emoji: "💇", unit: "/visit",
        providers: [{ id: "sa1", name: "Glow Salon", emoji: "💇", rating: 4.7, reviews: 175, km: 0.9, price: 18, verified: true }],
      },
      { id: "hammam", label: "Turkish bath", emoji: "🛁", unit: "/visit",
        providers: [{ id: "h1", name: "Hammam Al-Andalus", emoji: "🛁", rating: 4.9, reviews: 320, km: 3.0, price: 35, verified: true }],
      },
      { id: "spa", label: "Spa", emoji: "💆", unit: "/visit",
        providers: [{ id: "sp1", name: "Serenity Spa", emoji: "🌸", rating: 4.8, reviews: 210, km: 2.2, price: 40, verified: true }],
      },
    ],
  },
};

function CategoryPage() {
  const { slug } = useParams({ from: "/category/$slug" });
  const { lang } = useI18n();
  const cat = data[slug];
  const [activeSub, setActiveSub] = useState(cat?.subs[0]?.id ?? "");
  const [query, setQuery] = useState("");

  if (!cat) {
    return (
      <div className="px-5 pt-10 text-center">
        <p className="text-muted-foreground">Category not found.</p>
        <Link to="/" className="text-primary font-medium">Back to home</Link>
      </div>
    );
  }

  const sub = cat.subs.find((s) => s.id === activeSub) ?? cat.subs[0];
  const providers = sub.providers.filter((p) =>
    query.trim() ? p.name.toLowerCase().includes(query.toLowerCase()) : true,
  );
  const minPrice = providers.length ? Math.min(...providers.map((p) => p.price)) : 0;

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
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Categories</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-2xl">{cat.emoji}</span>
            <h1 className="text-2xl font-bold tracking-tight">{cat.title}</h1>
          </div>
        </div>
      </div>

      {/* search */}
      <div className="glass rounded-full flex items-center gap-2 px-5 py-3.5">
        <Search size={18} className="text-muted-foreground shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={cat.searchPh}
          className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted-foreground min-w-0"
        />
      </div>

      {/* sub-tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
        {cat.subs.map((s) => {
          const active = s.id === activeSub;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSub(s.id)}
              className="spring-tap shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold flex items-center gap-2 border transition-colors"
              style={{
                background: active ? "var(--color-primary)" : "white",
                color: active ? "white" : "var(--color-foreground)",
                borderColor: active ? "var(--color-primary)" : "var(--color-border)",
                boxShadow: active ? "var(--shadow-glass)" : "none",
              }}
            >
              <span className="text-base leading-none">{s.emoji}</span>
              <span className="whitespace-nowrap">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* count + view on map */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-base font-bold">{providers.length} providers nearby</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            From <span className="font-bold text-primary">{minPrice} JOD</span> {sub.unit}
          </div>
        </div>
        <button
          className="spring-tap rounded-full px-3.5 py-1.5 text-sm font-medium flex items-center gap-1.5"
          style={{ background: "var(--color-primary-tint)", color: "var(--color-primary)" }}
        >
          <MapPin size={14} /> View on map
        </button>
      </div>

      {/* provider list */}
      <div className="space-y-3">
        {providers.map((p) => (
          <Link
            key={p.id}
            to="/pro/$id"
            params={{ id: p.id }}
            className="spring-tap w-full glass rounded-3xl p-3 flex items-center gap-3 text-start"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
              style={{ background: "color-mix(in oklab, var(--color-primary) 8%, white)" }}
            >
              {p.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <div className="font-bold text-base truncate">{p.name}</div>
                {p.verified && <ShieldCheck size={15} className="text-primary shrink-0" />}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <Star size={13} className="fill-gold text-gold" />
                <span className="font-bold text-foreground">{p.rating}</span>
                <span>({p.reviews})</span>
                <span>·</span>
                <MapPin size={12} />
                <span>{p.km} km</span>
              </div>
              <div className="text-sm font-bold text-primary mt-1">
                {p.price} JOD<span className="font-medium text-muted-foreground">{sub.unit}</span>
              </div>
            </div>
            <ChevronRight size={18} className="text-muted-foreground rtl:rotate-180" />
          </Link>
        ))}
        {providers.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10">No providers match your search.</div>
        )}
      </div>
    </div>
  );
}
