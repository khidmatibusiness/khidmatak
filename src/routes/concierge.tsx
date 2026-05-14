import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Sparkles, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/concierge")({
  head: () => ({
    meta: [
      { title: "Khidmati · AI Concierge" },
      { name: "description", content: "Ask the Khidmati AI Concierge for service recommendations, bookings and tips." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === "string" ? s.q : undefined }),
  component: ConciergePage,
});

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function ConciergePage() {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const { q } = Route.useSearch();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        lang === "ar"
          ? "مرحباً! أنا مساعدك في خدمتي 👋 كيف أقدر أساعدك اليوم؟ تقدر تسألني عن حجز خدمة، توصية بمزود، أو أي سؤال عن التطبيق."
          : "Hi! I'm your Khidmati concierge 👋 How can I help today? Ask me to find a service, recommend a pro, or walk you through booking.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-concierge", {
        body: { messages: next, lang },
      });
      if (error) throw error;
      const reply = (data as { message?: string; error?: string })?.message;
      const errMsg = (data as { error?: string })?.error;
      if (errMsg) throw new Error(errMsg);
      setMessages((m) => [...m, { role: "assistant", content: reply ?? "…" }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(msg);
      setInput(trimmed);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            lang === "ar"
              ? `عذراً، صار خطأ: ${msg}. تقدر تعدّل الرسالة وتحاول مرة ثانية.`
              : `Sorry, this failed: ${msg}. You can edit the message and try again.`,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  // Send initial query from ?q=
  useEffect(() => {
    if (q && !sentInitial.current) {
      sentInitial.current = true;
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const suggestions = lang === "ar"
    ? ["اقترح سباك قريب", "كم سعر حصة بادل؟", "كيف أشحن المحفظة؟"]
    : ["Suggest a plumber nearby", "How much is a padel session?", "How do I top up my wallet?"];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-3 border-b border-border bg-background/80 backdrop-blur-md">
        <button
          onClick={() => navigate({ to: "/" })}
          className="spring-tap p-2 -ml-2 rounded-xl"
          aria-label="Back"
        >
          <ArrowLeft size={20} className="rtl:rotate-180" />
        </button>
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Sparkles size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold tracking-tight">{lang === "ar" ? "المساعد الذكي" : "AI Concierge"}</div>
          <div className="text-[11px] text-muted-foreground">
            {lang === "ar" ? "مدعوم بالذكاء الاصطناعي" : "Powered by AI"}
          </div>
        </div>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} content={m.content} />
        ))}
        {sending && <TypingBubble />}

        {messages.length <= 1 && !sending && (
          <div className="pt-3 space-y-2">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground px-1">
              {lang === "ar" ? "جرب" : "Try asking"}
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="spring-tap text-xs rounded-full px-3 py-2 bg-primary-tint text-primary font-medium"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* composer */}
      <form
        onSubmit={onSubmit}
        className="px-4 pt-3 pb-6 border-t border-border bg-background/90 backdrop-blur-md"
      >
        <div className="glass rounded-full flex items-center gap-2 pl-5 pr-1.5 py-1.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={lang === "ar" ? "اكتب رسالتك…" : "Type your message…"}
            className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted-foreground py-2 min-w-0"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="spring-tap shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-50"
            style={{ background: "var(--gradient-primary)" }}
            aria-label="Send"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </form>
    </div>
  );
}

function Bubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
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
          isUser
            ? "rounded-br-md text-white"
            : "rounded-bl-md bg-muted text-foreground"
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
