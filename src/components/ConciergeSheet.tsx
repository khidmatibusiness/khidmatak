import { useEffect, useRef, useState } from "react";
import { X, Sparkles, Send, Loader2, CalendarPlus, User2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProProfileSheet } from "@/components/ProProfileSheet";
import { BookingSheet } from "@/components/BookingSheet";

const SUBCAT_EMOJI: Record<string, string> = {
  cleaning: "🧼", laundry: "🧺", pest: "🪲", painting: "🎨",
  padel: "🎾", football: "⚽", gym: "🏋️", swim: "🏊", tennis: "🎾",
  dentist: "🦷", optician: "👓", lab: "🧪",
  barber: "💈", salon: "💇", hammam: "🛁", spa: "💆",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  serviceIds?: string[];
}

interface ServiceCard {
  id: string;
  name_en: string;
  name_ar: string | null;
  category: string | null;
  subcategory: string | null;
  price: number;
  pro_id: string | null;
  pro_name: string;
}

// Parse [service:UUID] markers and return clean text + ids
function extractServiceIds(text: string): { clean: string; ids: string[] } {
  const ids: string[] = [];
  const clean = text.replace(/\[service:([a-f0-9-]{8,})\]/gi, (_, id) => {
    ids.push(id);
    return "";
  }).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return { clean, ids: Array.from(new Set(ids)) };
}

export function ConciergeSheet({ open, onClose, initialQuery }: {
  open: boolean; onClose: () => void; initialQuery?: string;
}) {
  const { lang } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [serviceCache, setServiceCache] = useState<Record<string, ServiceCard>>({});
  const [profileId, setProfileId] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingProName, setBookingProName] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setMessages([{
        role: "assistant",
        content: lang === "ar"
          ? "أهلين! اسألني عن أي خدمة وأرتبلك أفضل الخيارات مع الحجز المباشر."
          : "Hey! Ask me for any service — I'll line up the best matches you can book in one tap.",
      }]);
      sentInitial.current = false;
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open, lang]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const fetchServiceCards = async (ids: string[]) => {
    const missing = ids.filter((id) => !serviceCache[id]);
    if (missing.length === 0) return;
    const { data: svc } = await supabase
      .from("services")
      .select("id, name_en, name_ar, category, subcategory, price, pro_id")
      .in("id", missing);
    const rows = (svc ?? []) as Array<Omit<ServiceCard, "pro_name">>;
    const proIds = Array.from(new Set(rows.map((s) => s.pro_id).filter(Boolean) as string[]));
    const proMap: Record<string, string> = {};
    if (proIds.length) {
      const { data: pros } = await supabase.from("users").select("id, full_name").in("id", proIds);
      for (const p of (pros ?? []) as Array<{ id: string; full_name: string | null }>) {
        if (p.full_name) proMap[p.id] = p.full_name;
      }
    }
    setServiceCache((prev) => {
      const next = { ...prev };
      for (const r of rows) {
        next[r.id] = { ...r, pro_name: (r.pro_id && proMap[r.pro_id]) || r.name_en };
      }
      return next;
    });
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-concierge", {
        body: { messages: next.map((m) => ({ role: m.role, content: m.content })), lang },
      });
      if (error) throw error;
      const raw = (data as { message?: string; error?: string })?.message ?? "";
      const errMsg = (data as { error?: string })?.error;
      if (errMsg) throw new Error(errMsg);
      const { clean, ids } = extractServiceIds(raw);
      if (ids.length) fetchServiceCards(ids);
      setMessages((m) => [...m, { role: "assistant", content: clean || "…", serviceIds: ids }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(msg);
      setMessages((m) => [...m, {
        role: "assistant",
        content: lang === "ar" ? "صار خطأ، حاول مرة ثانية." : "Something went wrong, try again.",
      }]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // Auto-send initial query
  useEffect(() => {
    if (open && initialQuery && !sentInitial.current) {
      sentInitial.current = true;
      send(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialQuery]);

  const suggestions = lang === "ar"
    ? ["سباك قريب", "حصة بادل تحت 30", "تنظيف منزل", "صالون رجالي"]
    : ["Plumber nearby", "Padel under 30 JOD", "Home cleaning", "Men's barber"];

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-end justify-center" onClick={onClose}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-up" />
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-white rounded-t-[32px] flex flex-col animate-fade-up"
          style={{ height: "88dvh", boxShadow: "var(--shadow-float)" }}
        >
          {/* grab handle */}
          <div className="pt-2.5 pb-1 flex justify-center">
            <div className="w-10 h-1.5 rounded-full bg-muted-foreground/25" />
          </div>

          {/* header */}
          <div className="px-5 pt-2 pb-3 flex items-center gap-3 border-b border-border/60">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Sparkles size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold tracking-tight">
                {lang === "ar" ? "المساعد الذكي" : "AI Concierge"}
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                {lang === "ar" ? "متصل الآن" : "Online · real catalog"}
              </div>
            </div>
            <button onClick={onClose} aria-label="Close" className="spring-tap w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground">
              <X size={20} />
            </button>
          </div>

          {/* messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className="space-y-2">
                <Bubble role={m.role} content={m.content} />
                {m.role === "assistant" && m.serviceIds && m.serviceIds.length > 0 && (
                  <div className="space-y-2 pl-9 rtl:pl-0 rtl:pr-9">
                    {m.serviceIds.map((id) => {
                      const s = serviceCache[id];
                      if (!s) {
                        return (
                          <div key={id} className="glass rounded-2xl p-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 size={14} className="animate-spin" />
                            {lang === "ar" ? "تحميل…" : "Loading…"}
                          </div>
                        );
                      }
                      const emoji = (s.subcategory && SUBCAT_EMOJI[s.subcategory]) || "✨";
                      const displayName = lang === "ar" ? (s.name_ar ?? s.name_en) : s.name_en;
                      return (
                        <div key={id} className="glass rounded-2xl p-3 border border-border/60">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                              style={{ background: "var(--color-primary-tint)" }}
                            >
                              {emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm truncate">{s.pro_name}</div>
                              <div className="text-[11px] text-muted-foreground truncate capitalize">
                                {displayName} · {s.category ?? "service"}
                              </div>
                            </div>
                            <div className="text-sm font-bold text-primary shrink-0">{Number(s.price).toFixed(0)} JOD</div>
                          </div>
                          <div className="flex gap-2 mt-2.5">
                            <button
                              onClick={() => setProfileId(s.id)}
                              className="spring-tap flex-1 rounded-full py-2 text-xs font-semibold bg-muted text-foreground flex items-center justify-center gap-1.5"
                            >
                              <User2 size={13} /> {lang === "ar" ? "الملف" : "Profile"}
                            </button>
                            <button
                              onClick={() => { setBookingId(s.id); setBookingProName(s.pro_name); }}
                              className="spring-tap flex-1 rounded-full py-2 text-xs font-semibold text-white flex items-center justify-center gap-1.5"
                              style={{ background: "var(--gradient-primary)" }}
                            >
                              <CalendarPlus size={13} /> {lang === "ar" ? "احجز" : "Book"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {sending && <TypingBubble />}
            {messages.length <= 1 && !sending && (
              <div className="flex flex-wrap gap-2 pt-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="spring-tap text-xs rounded-full px-3 py-2 font-medium"
                    style={{ background: "var(--color-primary-tint)", color: "var(--color-primary)" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* composer */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="px-4 pt-3 pb-5 border-t border-border/60 bg-white"
          >
            <div className="glass rounded-full flex items-center gap-2 pl-5 pr-1.5 py-1.5">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={lang === "ar" ? "اكتب رسالتك…" : "Ask anything…"}
                className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted-foreground py-2 min-w-0"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="spring-tap shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-40"
                style={{ background: "var(--gradient-primary)" }}
                aria-label="Send"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ProProfileSheet serviceId={profileId} open={!!profileId} onClose={() => setProfileId(null)} />
      <BookingSheet
        serviceId={bookingId}
        proName={bookingProName}
        open={!!bookingId}
        onClose={() => setBookingId(null)}
      />
    </>
  );
}

function Bubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  if (!content) return null;
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div
          className="w-7 h-7 rounded-full mr-2 rtl:mr-0 rtl:ml-2 flex items-center justify-center text-white shrink-0"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Sparkles size={13} />
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
          isUser ? "rounded-br-md text-white" : "rounded-bl-md bg-muted text-foreground"
        }`}
        style={isUser ? { background: "var(--gradient-primary)" } : undefined}
      >
        {content}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div
        className="w-7 h-7 rounded-full mr-2 rtl:mr-0 rtl:ml-2 flex items-center justify-center text-white shrink-0"
        style={{ background: "var(--gradient-primary)" }}
      >
        <Sparkles size={13} />
      </div>
      <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3 flex gap-1 items-center">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "120ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "240ms" }} />
      </div>
    </div>
  );
}
