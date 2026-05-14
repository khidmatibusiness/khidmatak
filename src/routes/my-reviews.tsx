import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Star, Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/my-reviews")({
  head: () => ({ meta: [{ title: "Khidmati · My reviews" }] }),
  component: MyReviewsPage,
});

interface R { id: string; rating: number | null; comment: string | null; created_at: string | null; pro_id: string | null; pro_name?: string; }

function MyReviewsPage() {
  const { lang } = useI18n();
  const [reviews, setReviews] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) { if (!cancelled) { setAuthed(false); setLoading(false); } return; }
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, pro_id")
        .eq("customer_id", uid)
        .order("created_at", { ascending: false });
      const list = (data ?? []) as R[];
      const proIds = Array.from(new Set(list.map((r) => r.pro_id).filter(Boolean) as string[]));
      const nameMap: Record<string, string> = {};
      if (proIds.length) {
        const { data: pros } = await supabase.from("users").select("id, full_name").in("id", proIds);
        for (const p of (pros ?? []) as Array<{ id: string; full_name: string | null }>) {
          if (p.full_name) nameMap[p.id] = p.full_name;
        }
      }
      if (!cancelled) {
        setReviews(list.map((r) => ({ ...r, pro_name: r.pro_id ? nameMap[r.pro_id] : undefined })));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="px-5 pt-7 pb-32 space-y-5 animate-fade-up">
      <div className="flex items-center gap-3">
        <Link to="/" className="spring-tap glass-strong w-11 h-11 rounded-full flex items-center justify-center" aria-label="Back">
          <ArrowLeft size={18} className="rtl:rotate-180" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{lang === "ar" ? "تقييماتي" : "My reviews"}</h1>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
      ) : !authed ? (
        <EmptyState
          icon={<MessageSquare size={20} />}
          title={lang === "ar" ? "سجل الدخول" : "Log in to see your reviews"}
          description={lang === "ar" ? "تحتاج لحساب لعرض التقييمات." : "You need an account to view your reviews."}
        />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={<Star size={20} />}
          title={lang === "ar" ? "لا تقييمات بعد" : "No reviews yet"}
          description={lang === "ar" ? "ستظهر هنا تقييماتك بعد الحجز." : "Reviews you leave after bookings will appear here."}
        />
      ) : (
        <div className="space-y-2.5">
          {reviews.map((r) => (
            <div key={r.id} className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">{r.pro_name ?? "Provider"}</div>
                <div className="flex items-center gap-1 text-xs">
                  <Star size={12} className="fill-gold text-gold" />
                  <span className="font-bold">{r.rating ?? "—"}</span>
                </div>
              </div>
              {r.comment && <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{r.comment}</p>}
              {r.created_at && <div className="text-[11px] text-muted-foreground mt-1.5">{new Date(r.created_at).toLocaleDateString()}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
