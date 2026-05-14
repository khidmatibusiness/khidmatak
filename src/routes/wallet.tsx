import { createFileRoute } from "@tanstack/react-router";
import {
  Plus, Send, ArrowUpRight, ArrowDownLeft, Eye, EyeOff, MessageCircle, Loader2, Receipt, Split,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WalletTxSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { haptic } from "@/lib/haptics";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Khidmati · Wallet" },
      { name: "description", content: "Top up, transfer and split with the Khidmati escrow-protected wallet." },
    ],
  }),
  component: WalletPage,
});

const WHATSAPP_NUMBER = "962790000000"; // TODO: replace with real support number

interface Wallet {
  id: string;
  balance: number;
  wallet_code: string | null;
}

interface Tx {
  id: string;
  type: string | null;
  amount: number;
  created_at: string | null;
  from_wallet_id: string | null;
  to_wallet_id: string | null;
  note: string | null;
}

function WalletPage() {
  const { t, lang } = useI18n();
  const [showCode, setShowCode] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<null | "topup" | "send" | "split">(null);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: w } = await supabase
      .from("wallets")
      .select("id,balance,wallet_code")
      .eq("user_id", user.id)
      .maybeSingle();
    if (w) {
      setWallet({ id: w.id, balance: Number(w.balance ?? 0), wallet_code: w.wallet_code });
      const { data: tx } = await supabase
        .from("wallet_transactions")
        .select("id,type,amount,created_at,from_wallet_id,to_wallet_id,note")
        .or(`from_wallet_id.eq.${w.id},to_wallet_id.eq.${w.id}`)
        .order("created_at", { ascending: false })
        .limit(50);
      setTxs((tx ?? []).map((r) => ({ ...r, amount: Number(r.amount) })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const balance = wallet?.balance ?? 0;

  return (
    <>
      <div className="px-5 pt-8 pb-8 space-y-5 animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight">{t("wallet")}</h1>

        {/* balance card */}
        <div
          className="rounded-3xl p-5 text-white relative overflow-hidden"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-float)" }}
        >
          <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/15" />
          <div className="absolute -left-6 -bottom-12 w-40 h-40 rounded-full bg-white/10" />
          <div className="relative">
            <div className="text-xs opacity-90">{t("balance")}</div>
            <div className="text-4xl font-bold tracking-tight mt-1">
              {balance.toFixed(2)} <span className="text-base font-medium opacity-80">JOD</span>
            </div>
            <div className="mt-4 glass-strong rounded-2xl p-3 flex items-center justify-between text-foreground">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("privateCode")}</div>
                <div className="font-mono text-sm font-semibold">
                  {showCode ? (wallet?.wallet_code ?? "—") : "•••• •••• ••"}
                </div>
              </div>
              <button onClick={() => setShowCode((v) => !v)} className="spring-tap p-2 rounded-xl bg-primary-tint text-primary">
                {showCode ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* actions */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={() => { haptic("light"); setSheet("topup"); }}
            className="spring-tap glass rounded-2xl p-3 flex flex-col items-center gap-1.5"
          >
            <span className="rounded-xl bg-primary-tint text-primary p-2"><Plus size={18} /></span>
            <span className="text-[11px] font-medium">{t("topUp")}</span>
          </button>
          <button
            onClick={() => { haptic("light"); setSheet("send"); }}
            className="spring-tap glass rounded-2xl p-3 flex flex-col items-center gap-1.5"
          >
            <span className="rounded-xl bg-primary-tint text-primary p-2"><Send size={18} /></span>
            <span className="text-[11px] font-medium">{lang === "ar" ? "إرسال" : "Send"}</span>
          </button>
          <button
            onClick={() => { haptic("light"); setSheet("split"); }}
            className="spring-tap glass rounded-2xl p-3 flex flex-col items-center gap-1.5"
          >
            <span className="rounded-xl bg-primary-tint text-primary p-2"><Split size={18} /></span>
            <span className="text-[11px] font-medium">{lang === "ar" ? "تقسيم" : "Split"}</span>
          </button>
        </div>

        {/* transactions */}
        <div>
          <h2 className="text-sm font-semibold mb-2 px-1">{t("recent")}</h2>
          <div className="glass rounded-3xl divide-y divide-border overflow-hidden">
            {loading && (
              <div className="p-3"><WalletTxSkeleton /></div>
            )}
            {!loading && txs.length === 0 && (
              <EmptyState
                icon={<Receipt size={20} />}
                title={lang === "ar" ? "لا توجد عمليات بعد" : "No transactions yet"}
                description={lang === "ar" ? "ستظهر تعاملات محفظتك هنا." : "Your wallet activity will appear here."}
                className="border-0"
              />
            )}
            {!loading && txs.map((tx) => {
              const credit = tx.to_wallet_id === wallet?.id;
              const date = tx.created_at ? new Date(tx.created_at).toLocaleDateString(undefined, {
                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
              }) : "";
              const label = describeTx(tx.type, credit);
              return (
                <div key={tx.id} className="flex items-center gap-3 p-3.5">
                  <div
                    className="rounded-xl p-2"
                    style={{
                      background: credit ? "var(--color-primary-tint)" : "color-mix(in oklab, var(--color-destructive) 12%, transparent)",
                      color: credit ? "var(--color-primary)" : "var(--color-destructive)",
                    }}
                  >
                    {credit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{label}</div>
                    <div className="text-[11px] text-muted-foreground">{date}{tx.note ? ` · ${tx.note}` : ""}</div>
                  </div>
                  <div
                    className="text-sm font-semibold"
                    style={{ color: credit ? "var(--color-primary)" : "var(--color-destructive)" }}
                  >
                    {credit ? "+" : "-"}{tx.amount.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center" onClick={() => setSheet(null)}>
          <div className="absolute inset-0 bg-black/40 animate-fade-up" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md glass-strong rounded-t-3xl p-5 pb-8 animate-fade-up max-h-[85vh] overflow-y-auto"
          >
            <div className="mx-auto h-1.5 w-10 rounded-full bg-muted mb-4" />
            {sheet === "topup" && <TopUpSheet />}
            {sheet === "send" && <SendByCodeSheet onDone={() => { setSheet(null); load(); }} />}
            {sheet === "split" && <SplitBillSheet balance={balance} onDone={() => { setSheet(null); load(); }} />}
          </div>
        </div>
      )}
    </>
  );
}

function describeTx(type: string | null, credit: boolean): string {
  switch (type) {
    case "booking_payment": return credit ? "Booking payment received" : "Booking payment";
    case "commission": return "Platform commission";
    case "split_send": return credit ? "Received by code" : "Sent by code";
    case "topup": return "Wallet top up";
    case "withdrawal": return "Withdrawal";
    default: return credit ? "Credit" : "Debit";
  }
}

function TopUpSheet() {
  const [amount, setAmount] = useState("20");
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi, I'd like to top up ${amount} JOD to my Khidmati wallet.`)}`;
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">Top up wallet</h3>
      <div>
        <div className="text-xs text-muted-foreground mb-1.5">Amount (JOD)</div>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-lg font-semibold outline-none focus:border-primary"
        />
        <div className="flex gap-2 mt-2">
          {[5, 10, 20, 50].map((v) => (
            <button
              key={v}
              onClick={() => setAmount(String(v))}
              className="spring-tap flex-1 rounded-xl py-2 text-xs font-medium bg-primary-tint text-primary"
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground bg-white/60">
        Card top up coming soon — contact us on WhatsApp to top up manually.
      </div>
      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        className="spring-tap w-full rounded-2xl py-3.5 text-sm font-semibold text-white flex items-center justify-center gap-2"
        style={{ background: "var(--gradient-primary)" }}
      >
        <MessageCircle size={16} /> Top up via WhatsApp
      </a>
    </div>
  );
}

function SendByCodeSheet({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState<{ full_name: string } | null>(null);
  const [looking, setLooking] = useState(false);
  const [sending, setSending] = useState(false);

  const lookup = async () => {
    if (!code.trim()) return toast.error("Enter a wallet code");
    setLooking(true);
    setRecipient(null);
    const { data, error } = await supabase.rpc("lookup_wallet_by_code", { p_code: code.trim() });
    setLooking(false);
    if (error) return toast.error(error.message);
    if (!data) return toast.error("No wallet found for that code");
    setRecipient(data as { full_name: string });
  };

  const send = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    setSending(true);
    const { error } = await supabase.rpc("process_split_send", {
      p_recipient_code: code.trim(),
      p_amount: amt,
    });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success(`${amt.toFixed(2)} JOD sent to ${recipient?.full_name}`);
    onDone();
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">Send by code</h3>
      <div>
        <div className="text-xs text-muted-foreground mb-1.5">Recipient wallet code</div>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setRecipient(null); }}
            placeholder="ABCD1234"
            className="flex-1 rounded-2xl border border-border bg-white px-4 py-3 font-mono outline-none focus:border-primary uppercase"
          />
          <button
            onClick={lookup}
            disabled={looking}
            className="spring-tap rounded-2xl px-4 text-sm font-semibold bg-primary-tint text-primary"
          >
            {looking ? <Loader2 size={16} className="animate-spin" /> : "Find"}
          </button>
        </div>
      </div>

      {recipient && (
        <div className="rounded-2xl bg-primary-tint p-3 text-sm">
          Sending to <span className="font-semibold">{recipient.full_name}</span>
        </div>
      )}

      <div>
        <div className="text-xs text-muted-foreground mb-1.5">Amount (JOD)</div>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-lg font-semibold outline-none focus:border-primary"
        />
      </div>

      <button
        onClick={send}
        disabled={!recipient || sending}
        className="spring-tap w-full rounded-2xl py-3.5 text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: "var(--gradient-primary)" }}
      >
        {sending && <Loader2 size={16} className="animate-spin" />}
        {recipient ? `Confirm & send` : "Find recipient first"}
      </button>
    </div>
  );
}
