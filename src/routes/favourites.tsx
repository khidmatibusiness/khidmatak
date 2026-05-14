import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Heart, Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getFavs, toggleFav } from "@/lib/favs";
import { useI18n } from "@/lib/i18n";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/favourites")({
  head: () => ({ meta: [{ title: "Khidmati · Favourites" }] }),
  component: FavouritesPage,
});

interface S { id: string; name_en: string; name_ar: string | null; price: number; category: string | null; subcategory: string | null; pro_id: string | null; }

function FavouritesPage() {
  const { lang } = useI18n();
  const [ids, setIds] = useState<string[]>([]);
  const [items, setItems] = useState<S[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sync = () => setIds(getFavs());
    sync();
    window.addEventListener("khidmati:favs", sync);
    return () => window.removeEventListener("khidmati:favs", sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (ids.length === 0) { setItems([]); setLoading(false); return; }
      const { data } = await supabase
        .from("services")
        .select("id, name_en, name_ar, price, category, subcategory, pro_id")
        .in("id", ids);
      if (!cancelled) { setItems((data ?? []) as S[]); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [ids]);

  const remove = (id: string) => setIds(toggleFav(id));

  return (
    <div className="px-5 pt-7 pb-32 space-y-5 animate-fade-up">
      <div className="flex items-center gap-3">
        <Link to="/" className="spring-tap glass-strong w-11 h-11 rounded-full flex items-center justify-center" aria-label="Back">
          <ArrowLeft size={18} className="rtl:rotate-180" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{lang === "ar" ? "المفضلة" : "Favourites"}</h1>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Heart size={20} />}
          title={lang === "ar" ? "لا توجد مفضلات بعد" : "No favourites yet"}
          description={lang === "ar" ? "اضغط على القلب لحفظ مزود." : "Tap the heart on any provider to save it."}
        />
      ) : (
        <div className="space-y-2.5">
          {items.map((s) => {
            const name = lang === "ar" ? (s.name_ar ?? s.name_en) : s.name_en;
            return (
              <div key={s.id} className="glass rounded-2xl p-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary-tint flex items-center justify-center text-primary text-xl shrink-0">
                  <Star size={18} />
                </div>
                <Link to="/pro/$id" params={{ id: s.id }} className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{name}</div>
                  <div className="text-[11px] text-muted-foreground capitalize">{s.category ?? "Service"}{s.subcategory ? ` · ${s.subcategory}` : ""}</div>
                </Link>
                <div className="text-sm font-bold text-primary shrink-0">{Number(s.price).toFixed(0)} JOD</div>
                <button onClick={() => remove(s.id)} aria-label="Remove" className="spring-tap p-2 rounded-full hover:bg-muted">
                  <Heart size={16} className="fill-destructive text-destructive" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
