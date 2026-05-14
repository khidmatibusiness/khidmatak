import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Star } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/bookings/$id/review")({
  head: () => ({ meta: [{ title: "Khidmati · Review" }] }),
  component: ReviewScreen,
});

interface BookingInfo {
  id: string;
  customer_id: string | null;
  pro_id: string | null;
  status: string | null;
  reviewed_at: string | null;
  reviewed_skipped: boolean;
  pro_name: string | null;
}

function ReviewScreen() {
  const { id } = Route.useParams();
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [b, setB] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id,customer_id,pro_id,status,reviewed_at,reviewed_skipped")
        .eq("id", id)
        .maybeSingle();
      if (!data) { setB(null); setLoading(false); return; }
      let proName: string | null = null;
      if (data.pro_id) {
        const { data: p } = await supabase.from("users").select("full_name").eq("id", data.pro_id).maybeSingle();
        proName = p?.full_name ?? null;
      }
      setB({ ...data, pro_name: proName });
      setLoading(false);
    })();
  }, [id]);

  const markSkipped = async () => {
    setSkipping(true);
    await supabase.from("bookings").update({ reviewed_skipped: true }).eq("id", id);
    setSkipping(false);
    navigate({ to: "/bookings" });
  };

  const submit = async () => {
    if (!b || !b.pro_id || !b.customer_id) return;
    if (rating < 1) { toast.error(lang === "ar" ? "اختر تقييماً" : "Pick a rating"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      booking_id: b.id,
      customer_id: b.customer_id,
      pro_id: b.pro_id,
      rating,
      comment: comment.trim() || null,
    });
    if (error) { setSubmitting(false); toast.error(error.message); return; }
    await supabase.from("bookings").update({ reviewed_at: new Date().toISOString() }).eq("id", b.id);
    setSubmitting(false);
    toast.success(lang === "ar" ? "شكراً لتقييمك" : "Thanks for your review");
    navigate({ to: "/bookings" });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="animate-spin" size={20} /></div>;
  }
  if (!b) {
    return <div className="px-5 pt-10 text-center text-sm text-muted-foreground">{lang === "ar" ? "غير موجود" : "Not found"}</div>;
  }

  const proName = b.pro_name ?? (lang === "ar" ? "مزود الخدمة" : "Provider");
  const initial = (proName.trim()[0] ?? "?").toUpperCase();
  const display = hover || rating;

  return (
    <div className="px-5 pt-6 pb-32 space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <button onClick={markSkipped} disabled={skipping} className="spring-tap p-2 -ml-2 rounded-xl">
          <ArrowLeft size={20} className="rtl:rotate-180" />
        </button>
        <button onClick={markSkipped} disabled={skipping} className="text-xs font-medium text-muted-foreground spring-tap px-2 py-1">
          {lang === "ar" ? "تخطي" : "Skip"}
        </button>
      </div>

      <div className="text-center space-y-3">
        <div
          className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center text-white text-3xl font-bold"
          style={{ background: "var(--gradient-primary)" }}
        >
          {initial}
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{lang === "ar" ? "كيف كانت الخدمة؟" : "How was your service?"}</div>
          <div className="text-xl font-bold mt-1">{proName}</div>
        </div>
      </div>

      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="spring-tap p-1"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star
              size={40}
              strokeWidth={1.5}
              className="transition-colors"
              fill={n <= display ? "oklch(0.82 0.16 85)" : "transparent"}
              color={n <= display ? "oklch(0.62 0.18 85)" : "var(--color-muted-foreground)"}
            />
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={lang === "ar" ? "أضف ملاحظة (اختياري)" : "Add a comment (optional)"}
        rows={4}
        className="w-full glass rounded-2xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      <button
        onClick={submit}
        disabled={submitting || rating < 1}
        className="spring-tap w-full rounded-2xl py-4 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ background: "var(--gradient-primary)" }}
      >
        {submitting && <Loader2 size={16} className="animate-spin" />}
        {lang === "ar" ? "إرسال التقييم" : "Submit review"}
      </button>
    </div>
  );
}
