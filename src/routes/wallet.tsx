import { createFileRoute } from "@tanstack/react-router";
import {
  Plus, Send, ArrowUpRight, ArrowDownLeft, Eye, EyeOff, MessageCircle, Loader2, Receipt,
  Users, Trash2, X, PiggyBank, HandCoins, Heart, Sparkles, Check, Copy, Clock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WalletTxSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { haptic } from "@/lib/haptics";
import { getGroups, saveGroups, type SplitGroup, type SplitMember } from "@/lib/split-groups";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Khidmati · Wallet" },
      { name: "description", content: "Top up, transfer and split with the Khidmati escrow-protected wallet." },
    ],
  }),
  component: WalletPage,
});

const WHATSAPP_NUMBER = "962790000000";

interface Wallet {
  id: string;
  balance: number;
  wallet_code: string | null;
  piggy_balance: number;
  roundup_enabled: boolean;
  roundup_mode: "save" | "donate";
  roundup_charity_id: string | null;
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

interface PendingTransfer {
  id: string;
  requester_id: string;
  recipient_id: string;
  amount: number;
  note: string | null;
  status: string;
  created_at: string;
  other_name?: string;
  direction: "incoming" | "outgoing";
}

type Sheet = null | "topup" | "send" | "request" | "roundup" | "groups" | "piggy";

function WalletPage() {
  const { t, lang } = useI18n();
  const [showCode, setShowCode] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [pending, setPending] = useState<PendingTransfer[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<Sheet>(null);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const { data: w } = await supabase
      .from("wallets")
      .select("id,balance,wallet_code,piggy_balance,roundup_enabled,roundup_mode,roundup_charity_id" as any)
      .eq("user_id", user.id)
      .maybeSingle();

    if (w) {
      const wa = w as any;
      setWallet({
        id: wa.id,
        balance: Number(wa.balance ?? 0),
        wallet_code: wa.wallet_code,
        piggy_balance: Number(wa.piggy_balance ?? 0),
        roundup_enabled: Boolean(wa.roundup_enabled),
        roundup_mode: (wa.roundup_mode ?? "save") as "save" | "donate",
        roundup_charity_id: wa.roundup_charity_id ?? null,
      });

      const [{ data: tx }, { data: pend }] = await Promise.all([
        supabase
          .from("wallet_transactions")
          .select("id,type,amount,created_at,from_wallet_id,to_wallet_id,note")
          .or(`from_wallet_id.eq.${wa.id},to_wallet_id.eq.${wa.id}`)
          .order("created_at", { ascending: false })
          .limit(50),
        (supabase.from as any)("transfer_requests")
          .select("id,requester_id,recipient_id,amount,note,status,created_at")
          .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
      ]);

      setTxs((tx ?? []).map((r) => ({ ...r, amount: Number(r.amount) })));

      const list = ((pend ?? []) as any[]).map((p) => ({
        ...p,
        amount: Number(p.amount),
        direction: (p.requester_id === user.id ? "outgoing" : "incoming") as "incoming" | "outgoing",
      })) as PendingTransfer[];

      // resolve other party names
      const otherIds = Array.from(new Set(list.map((p) => p.direction === "incoming" ? p.requester_id : p.recipient_id)));
      if (otherIds.length) {
        const { data: usrs } = await supabase.from("users").select("id,full_name").in("id", otherIds);
        const map = new Map((usrs ?? []).map((u) => [u.id, u.full_name ?? "User"]));
        list.forEach((p) => { p.other_name = map.get(p.direction === "incoming" ? p.requester_id : p.recipient_id) ?? "User"; });
      }
      setPending(list);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const balance = wallet?.balance ?? 0;
  const piggy = wallet?.piggy_balance ?? 0;

  const formattedCode = wallet?.wallet_code
    ? `KHD-${wallet.wallet_code.match(/.{1,4}/g)?.join("-") ?? wallet.wallet_code}`
    : null;

  const copyCode = async () => {
    if (!formattedCode) return;
    await navigator.clipboard.writeText(formattedCode);
    haptic("light");
    toast.success(lang === "ar" ? "تم النسخ" : "Code copied");
  };

  // round-up savings goal (visual only — 10 JOD)
  const piggyGoal = 10;
  const piggyPct = Math.min(100, Math.round((piggy / piggyGoal) * 100));

  return (
    <>
      <div className="px-5 pt-8 pb-8 space-y-5 animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight">{t("wallet")}</h1>

        {/* balance card */}
        <div
          className="rounded-[2rem] p-6 text-white relative overflow-hidden"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-float)" }}
        >
          <div className="absolute -right-12 -top-16 w-56 h-56 rounded-full bg-white/15" />
          <div className="absolute -left-10 -bottom-20 w-52 h-52 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div className="text-[11px] uppercase tracking-[0.18em] opacity-90 font-semibold">
                {lang === "ar" ? "رصيد المحفظة" : "Wallet balance"}
              </div>
              <span className="text-[11px] font-semibold bg-white/20 backdrop-blur px-2.5 py-1 rounded-full">JOD</span>
            </div>
            <div className="mt-3 flex items-end gap-3">
              <div className="text-5xl font-bold tracking-tight leading-none">
                {showCode ? balance.toFixed(2) : "•••.••"}
              </div>
              <button
                onClick={() => setShowCode((v) => !v)}
                className="spring-tap pb-1 opacity-90"
                aria-label={showCode ? "Hide" : "Show"}
              >
                {showCode ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>

            <div className="mt-5 rounded-2xl px-4 py-3 flex items-center justify-between bg-white/15 backdrop-blur border border-white/20">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.18em] opacity-80 font-semibold">
                  {lang === "ar" ? "رمز خاص" : "Private code"}
                </div>
                <div className="font-mono text-base font-bold tracking-wider truncate">
                  {formattedCode ?? "—"}
                </div>
              </div>
              <button onClick={copyCode} className="spring-tap p-2.5 rounded-xl bg-white/20 hover:bg-white/30 shrink-0" aria-label="Copy">
                <Copy size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* actions — 3 tiles */}
        <div className="grid grid-cols-3 gap-3">
          <BigActionTile icon={<Plus size={22} />} label={t("topUp") as string} onClick={() => setSheet("topup")} />
          <BigActionTile icon={<Send size={22} />} label={lang === "ar" ? "تحويل" : "Transfer"} onClick={() => setSheet("send")} />
          <BigActionTile icon={<Users size={22} />} label={lang === "ar" ? "تقسيم" : "Split"} onClick={() => setSheet("groups")} />
        </div>

        {/* round-up savings */}
        <button
          onClick={() => { haptic("light"); setSheet("piggy"); }}
          className="spring-tap w-full glass rounded-3xl p-4 text-start"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary-tint text-primary flex items-center justify-center shrink-0">
              <PiggyBank size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[15px] leading-tight">
                {lang === "ar" ? "مدخرات التقريب" : "Round-up savings"}
              </div>
              <div className="text-[12px] text-muted-foreground mt-0.5">
                {piggy.toFixed(2)} JOD / {piggyGoal.toFixed(2)} JOD
              </div>
            </div>
            <span
              onClick={(e) => { e.stopPropagation(); haptic("light"); piggy > 0 ? supabase.rpc("piggy_to_wallet").then(({ error }) => { if (error) toast.error(error.message); else { toast.success(lang === "ar" ? "تم التحويل" : "Transferred"); load(); } }) : setSheet("roundup"); }}
              className="text-[13px] font-semibold text-primary shrink-0"
            >
              {piggy > 0 ? (lang === "ar" ? "حوّل للمحفظة" : "Transfer to main") : (lang === "ar" ? "فعّل" : "Enable")}
            </span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-primary-tint overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${piggyPct}%`, background: "var(--gradient-primary)" }}
            />
          </div>
        </button>

        {/* request money quick action */}
        <button
          onClick={() => { haptic("light"); setSheet("request"); }}
          className="spring-tap w-full glass rounded-2xl p-3 flex items-center justify-center gap-2 text-sm font-semibold text-primary"
        >
          <HandCoins size={16} /> {lang === "ar" ? "اطلب مالاً" : "Request money"}
        </button>

        {/* pending transfers */}
        {pending.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-2 px-1 flex items-center gap-2">
              <Clock size={14} /> {lang === "ar" ? "الطلبات المعلقة" : "Pending transfers"}
              <span className="text-[10px] font-bold bg-primary text-white rounded-full px-1.5 py-0.5">{pending.length}</span>
            </h2>
            <div className="space-y-2">
              {pending.map((p) => (
                <PendingRow key={p.id} p={p} onChange={load} userBalance={balance} />
              ))}
            </div>
          </div>
        )}

        {/* transactions */}
        <div>
          <h2 className="text-sm font-semibold mb-2 px-1">{t("recent")}</h2>
          <div className="glass rounded-3xl divide-y divide-border overflow-hidden">
            {loading && (<div className="p-3"><WalletTxSkeleton /></div>)}
            {!loading && txs.length === 0 && (
              <EmptyState
                icon={<Receipt size={20} />}
                title={lang === "ar" ? "لا توجد عمليات بعد" : "No transactions yet"}
                description={lang === "ar" ? "ستظهر تعاملات محفظتك هنا." : "Your wallet activity will appear here."}
                className="border-0"
              />
            )}
            {!loading && txs.map((tx) => {
              const credit = tx.to_wallet_id === wallet?.id && tx.from_wallet_id !== wallet?.id;
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
            {sheet === "request" && <RequestSheet onDone={() => { setSheet(null); load(); }} />}
            {sheet === "roundup" && wallet && <RoundupSheet wallet={wallet} onDone={() => { setSheet(null); load(); }} />}
            {sheet === "piggy" && wallet && (
              <PiggySheet
                wallet={wallet}
                onOpenSettings={() => setSheet("roundup")}
                onDone={() => { setSheet(null); load(); }}
              />
            )}
            {sheet === "groups" && <GroupsSheet onClose={() => setSheet(null)} />}
          </div>
        </div>
      )}
    </>
  );
}

function ActionTile({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={() => { haptic("light"); onClick(); }}
      className="spring-tap glass rounded-2xl p-3 flex flex-col items-center gap-1.5"
    >
      <span className="rounded-xl bg-primary-tint text-primary p-2">{icon}</span>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function PendingRow({ p, onChange, userBalance }: { p: PendingTransfer; onChange: () => void; userBalance: number }) {
  const { lang } = useI18n();
  const [busy, setBusy] = useState(false);
  const incoming = p.direction === "incoming";

  const call = async (fn: "accept_transfer" | "reject_transfer" | "withdraw_transfer") => {
    if (fn === "accept_transfer" && userBalance < p.amount) {
      toast.error(lang === "ar" ? "رصيد غير كافٍ" : "Insufficient balance");
      return;
    }
    setBusy(true);
    const { error } = await (supabase.rpc as any)(fn, { p_id: p.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(
      fn === "accept_transfer" ? (lang === "ar" ? "تم القبول" : "Accepted")
      : fn === "reject_transfer" ? (lang === "ar" ? "تم الرفض" : "Rejected")
      : (lang === "ar" ? "تم السحب" : "Withdrawn")
    );
    onChange();
  };

  return (
    <div className="glass rounded-2xl p-3.5 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary-tint text-primary flex items-center justify-center shrink-0">
        <HandCoins size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">
          {incoming
            ? (lang === "ar" ? `${p.other_name} يطلب منك` : `${p.other_name} requested`)
            : (lang === "ar" ? `أنت طلبت من ${p.other_name}` : `You requested from ${p.other_name}`)}
        </div>
        <div className="text-[11px] text-muted-foreground truncate">
          {p.amount.toFixed(2)} JOD{p.note ? ` · ${p.note}` : ""}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {incoming ? (
          <>
            <button
              onClick={() => call("reject_transfer")}
              disabled={busy}
              className="spring-tap w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-50"
              style={{ background: "color-mix(in oklab, var(--color-destructive) 12%, transparent)", color: "var(--color-destructive)" }}
              aria-label="Reject"
            >
              <X size={16} />
            </button>
            <button
              onClick={() => call("accept_transfer")}
              disabled={busy}
              className="spring-tap w-9 h-9 rounded-xl text-white flex items-center justify-center disabled:opacity-50"
              style={{ background: "var(--gradient-primary)" }}
              aria-label="Accept"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={16} />}
            </button>
          </>
        ) : (
          <button
            onClick={() => call("withdraw_transfer")}
            disabled={busy}
            className="spring-tap rounded-xl px-3 h-9 text-xs font-semibold bg-muted disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : (lang === "ar" ? "سحب" : "Withdraw")}
          </button>
        )}
      </div>
    </div>
  );
}

function describeTx(type: string | null, credit: boolean): string {
  switch (type) {
    case "booking_payment": return credit ? "Booking payment received" : "Booking payment";
    case "escrow_hold": return "Booking held in escrow";
    case "commission": return "Platform commission";
    case "refund": return credit ? "Refund received" : "Refund";
    case "split_send": return credit ? "Received by code" : "Sent by code";
    case "transfer_request": return credit ? "Transfer received" : "Transfer sent";
    case "topup": return "Wallet top up";
    case "withdrawal": return "Withdrawal";
    case "roundup_save": return "Round-up to piggy";
    case "roundup_donation": return "Round-up donation";
    case "piggy_release": return "Piggy moved to wallet";
    case "piggy_donation": return "Piggy donated";
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
          inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-lg font-semibold outline-none focus:border-primary"
        />
        <div className="flex gap-2 mt-2">
          {[5, 10, 20, 50].map((v) => (
            <button key={v} onClick={() => setAmount(String(v))}
              className="spring-tap flex-1 rounded-xl py-2 text-xs font-medium bg-primary-tint text-primary">{v}</button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground bg-white/60">
        Card top up coming soon — contact us on WhatsApp to top up manually.
      </div>
      <a href={waUrl} target="_blank" rel="noreferrer"
        className="spring-tap w-full rounded-2xl py-3.5 text-sm font-semibold text-white flex items-center justify-center gap-2"
        style={{ background: "var(--gradient-primary)" }}>
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
    setLooking(true); setRecipient(null);
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
    const { error } = await supabase.rpc("process_split_send", { p_recipient_code: code.trim(), p_amount: amt });
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
          <input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setRecipient(null); }}
            placeholder="ABCD1234EFGH"
            className="flex-1 rounded-2xl border border-border bg-white px-4 py-3 font-mono outline-none focus:border-primary uppercase" />
          <button onClick={lookup} disabled={looking}
            className="spring-tap rounded-2xl px-4 text-sm font-semibold bg-primary-tint text-primary">
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
        <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-lg font-semibold outline-none focus:border-primary" />
      </div>
      <button onClick={send} disabled={!recipient || sending}
        className="spring-tap w-full rounded-2xl py-3.5 text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: "var(--gradient-primary)" }}>
        {sending && <Loader2 size={16} className="animate-spin" />}
        {recipient ? `Confirm & send` : "Find recipient first"}
      </button>
    </div>
  );
}

function RequestSheet({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [recipient, setRecipient] = useState<{ full_name: string } | null>(null);
  const [looking, setLooking] = useState(false);
  const [sending, setSending] = useState(false);

  const lookup = async () => {
    if (!code.trim()) return toast.error("Enter a wallet code");
    setLooking(true); setRecipient(null);
    const { data, error } = await supabase.rpc("lookup_wallet_by_code", { p_code: code.trim() });
    setLooking(false);
    if (error) return toast.error(error.message);
    if (!data) return toast.error("No wallet found for that code");
    setRecipient(data as { full_name: string });
  };

  const send = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!recipient) return toast.error("Find recipient first");
    setSending(true);
    const { error } = await (supabase.rpc as any)("request_transfer", {
      p_recipient_code: code.trim(),
      p_amount: amt,
      p_note: note.trim() || null,
    });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success(`Requested ${amt.toFixed(2)} JOD from ${recipient.full_name}`);
    onDone();
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">Request money</h3>
      <p className="text-xs text-muted-foreground -mt-2">They'll be notified and can accept or reject the request.</p>
      <div>
        <div className="text-xs text-muted-foreground mb-1.5">From wallet code</div>
        <div className="flex gap-2">
          <input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setRecipient(null); }}
            placeholder="ABCD1234EFGH"
            className="flex-1 rounded-2xl border border-border bg-white px-4 py-3 font-mono outline-none focus:border-primary uppercase" />
          <button onClick={lookup} disabled={looking}
            className="spring-tap rounded-2xl px-4 text-sm font-semibold bg-primary-tint text-primary">
            {looking ? <Loader2 size={16} className="animate-spin" /> : "Find"}
          </button>
        </div>
      </div>
      {recipient && (
        <div className="rounded-2xl bg-primary-tint p-3 text-sm">
          Requesting from <span className="font-semibold">{recipient.full_name}</span>
        </div>
      )}
      <div>
        <div className="text-xs text-muted-foreground mb-1.5">Amount (JOD)</div>
        <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-lg font-semibold outline-none focus:border-primary" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-1.5">Note (optional)</div>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} placeholder="What's it for?"
          className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary" />
      </div>
      <button onClick={send} disabled={!recipient || sending}
        className="spring-tap w-full rounded-2xl py-3.5 text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: "var(--gradient-primary)" }}>
        {sending && <Loader2 size={16} className="animate-spin" />}
        Send request
      </button>
    </div>
  );
}

function PiggySheet({ wallet, onOpenSettings, onDone }: { wallet: Wallet; onOpenSettings: () => void; onDone: () => void }) {
  const { lang } = useI18n();
  const [busy, setBusy] = useState(false);
  const [charityCode, setCharityCode] = useState("");
  const piggy = wallet.piggy_balance;

  const release = async () => {
    setBusy(true);
    const { data, error } = await (supabase.rpc as any)("piggy_to_wallet");
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`+${Number(data ?? 0).toFixed(2)} JOD ${lang === "ar" ? "إلى المحفظة" : "moved to wallet"}`);
    onDone();
  };

  const donate = async () => {
    if (!charityCode.trim()) return toast.error(lang === "ar" ? "أدخل رمز محفظة الجمعية" : "Enter charity wallet code");
    setBusy(true);
    const { data, error } = await (supabase.rpc as any)("donate_piggy", { p_charity_code: charityCode.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${lang === "ar" ? "تم التبرع بـ" : "Donated"} ${Number(data ?? 0).toFixed(2)} JOD`);
    onDone();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">{lang === "ar" ? "حصالة التقريب" : "Round-up piggy bank"}</h3>
        <button onClick={onOpenSettings} className="text-xs font-semibold text-primary spring-tap">
          {lang === "ar" ? "الإعدادات" : "Settings"}
        </button>
      </div>

      <div className="rounded-3xl p-5 text-white text-center"
        style={{ background: "linear-gradient(135deg, oklch(0.78 0.16 350), oklch(0.7 0.18 25))" }}>
        <PiggyBank size={32} className="mx-auto mb-2" />
        <div className="text-xs opacity-90">{lang === "ar" ? "الرصيد المدّخر" : "Saved up"}</div>
        <div className="text-3xl font-bold">{piggy.toFixed(2)} <span className="text-base font-semibold opacity-80">JOD</span></div>
      </div>

      {!wallet.roundup_enabled && (
        <div className="rounded-2xl border border-dashed border-border p-3 text-xs text-muted-foreground text-center">
          {lang === "ar" ? "التقريب معطّل. فعّله من الإعدادات لتبدأ بادخار البقايا تلقائياً." : "Round-up is off. Turn it on in settings to start auto-saving spare cents."}
        </div>
      )}

      <button onClick={release} disabled={busy || piggy <= 0}
        className="spring-tap w-full rounded-2xl py-3.5 text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: "var(--gradient-primary)" }}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowDownLeft size={16} />}
        {lang === "ar" ? "نقل إلى المحفظة" : "Move to wallet"}
      </button>

      <div className="space-y-2 pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Heart size={12} /> {lang === "ar" ? "تبرّع لمحفظة جمعية" : "Donate to a charity wallet"}
        </div>
        <input value={charityCode} onChange={(e) => setCharityCode(e.target.value.toUpperCase())}
          placeholder="CHAR1234WXYZ"
          className="w-full rounded-2xl border border-border bg-white px-4 py-3 font-mono uppercase outline-none focus:border-primary" />
        <button onClick={donate} disabled={busy || piggy <= 0 || !charityCode.trim()}
          className="spring-tap w-full rounded-2xl py-3 text-sm font-semibold disabled:opacity-50 bg-primary-tint text-primary flex items-center justify-center gap-2">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Heart size={16} />}
          {lang === "ar" ? "تبرّع الآن" : "Donate now"}
        </button>
      </div>
    </div>
  );
}

function RoundupSheet({ wallet, onDone }: { wallet: Wallet; onDone: () => void }) {
  const { lang } = useI18n();
  const [enabled, setEnabled] = useState(wallet.roundup_enabled);
  const [mode, setMode] = useState<"save" | "donate">(wallet.roundup_mode);
  const [charityCode, setCharityCode] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (enabled && mode === "donate" && !charityCode.trim() && !wallet.roundup_charity_id) {
      return toast.error(lang === "ar" ? "أدخل رمز محفظة الجمعية" : "Enter a charity wallet code");
    }
    setSaving(true);
    const { error } = await (supabase.rpc as any)("set_roundup_settings", {
      p_enabled: enabled,
      p_mode: mode,
      p_charity_code: charityCode.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(lang === "ar" ? "تم الحفظ" : "Saved");
    onDone();
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">{lang === "ar" ? "إعدادات التقريب" : "Round-up settings"}</h3>
      <p className="text-xs text-muted-foreground -mt-2">
        {lang === "ar"
          ? "كل دفعة محفظة تُقرَّب لأقرب دينار، والبقية تذهب لحصالتك أو لجمعية خيرية."
          : "Every wallet payment rounds up to the next JOD; the spare cents go to your piggy bank or a charity."}
      </p>

      <button onClick={() => setEnabled((v) => !v)}
        className="w-full glass rounded-2xl p-3.5 flex items-center justify-between spring-tap">
        <div className="text-start">
          <div className="font-semibold text-sm">{lang === "ar" ? "تفعيل التقريب" : "Enable round-up"}</div>
          <div className="text-[11px] text-muted-foreground">{lang === "ar" ? "تطبيق على دفعات الحجز" : "Applies to booking payments"}</div>
        </div>
        <div className={`w-11 h-6 rounded-full p-0.5 transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}>
          <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : ""}`} />
        </div>
      </button>

      <div className={`grid grid-cols-2 gap-2 ${!enabled ? "opacity-50 pointer-events-none" : ""}`}>
        <button onClick={() => setMode("save")}
          className="spring-tap rounded-2xl border p-4 text-start"
          style={{
            background: mode === "save" ? "color-mix(in oklab, var(--color-primary) 8%, white)" : "white",
            borderColor: mode === "save" ? "var(--color-primary)" : "var(--color-border)",
          }}>
          <PiggyBank size={20} className="text-primary mb-2" />
          <div className="font-bold text-sm">{lang === "ar" ? "ادّخار" : "Save"}</div>
          <div className="text-[11px] text-muted-foreground">{lang === "ar" ? "إلى الحصالة" : "To piggy bank"}</div>
        </button>
        <button onClick={() => setMode("donate")}
          className="spring-tap rounded-2xl border p-4 text-start"
          style={{
            background: mode === "donate" ? "color-mix(in oklab, var(--color-primary) 8%, white)" : "white",
            borderColor: mode === "donate" ? "var(--color-primary)" : "var(--color-border)",
          }}>
          <Heart size={20} className="text-primary mb-2" />
          <div className="font-bold text-sm">{lang === "ar" ? "تبرّع" : "Donate"}</div>
          <div className="text-[11px] text-muted-foreground">{lang === "ar" ? "إلى جمعية" : "To a charity"}</div>
        </button>
      </div>

      {enabled && mode === "donate" && (
        <div>
          <div className="text-xs text-muted-foreground mb-1.5">
            {lang === "ar" ? "رمز محفظة الجمعية" : "Charity wallet code"}
            {wallet.roundup_charity_id && <span className="text-[10px] ml-2">(saved · leave blank to keep)</span>}
          </div>
          <input value={charityCode} onChange={(e) => setCharityCode(e.target.value.toUpperCase())}
            placeholder="CHAR1234WXYZ"
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 font-mono uppercase outline-none focus:border-primary" />
        </div>
      )}

      <button onClick={save} disabled={saving}
        className="spring-tap w-full rounded-2xl py-3.5 text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: "var(--gradient-primary)" }}>
        {saving && <Loader2 size={16} className="animate-spin" />}
        {lang === "ar" ? "حفظ" : "Save settings"}
      </button>
    </div>
  );
}

function GroupsSheet({ onClose }: { onClose: () => void }) {
  const [groups, setGroups] = useState<SplitGroup[]>([]);
  const [editing, setEditing] = useState<SplitGroup | null>(null);

  useEffect(() => { setGroups(getGroups()); }, []);

  const remove = (id: string) => {
    const next = groups.filter((g) => g.id !== id);
    setGroups(next); saveGroups(next);
    toast.success("Group deleted");
  };

  const persist = (g: SplitGroup) => {
    const all = getGroups();
    const i = all.findIndex((x) => x.id === g.id);
    if (i >= 0) all[i] = g; else all.unshift(g);
    saveGroups(all); setGroups(all); setEditing(null);
    toast.success("Group saved");
  };

  if (editing) return <GroupEditor group={editing} onCancel={() => setEditing(null)} onSave={persist} />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">Split groups</h3>
        <button onClick={onClose} className="spring-tap p-1.5 rounded-full hover:bg-muted" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">
        Save groups of friends with their wallet codes. Use them to split a bill or a booking instantly.
      </p>
      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No groups yet. Create your first one below.
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => (
            <div key={g.id} className="glass rounded-2xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-tint text-primary flex items-center justify-center">
                <Users size={16} />
              </div>
              <button onClick={() => setEditing(g)} className="flex-1 min-w-0 text-start">
                <div className="font-semibold text-sm truncate">{g.name}</div>
                <div className="text-[11px] text-muted-foreground">{g.members.length + 1} members (incl. you)</div>
              </button>
              <button onClick={() => remove(g.id)} className="spring-tap p-2 rounded-full hover:bg-muted text-destructive" aria-label="Delete">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => setEditing({ id: crypto.randomUUID(), name: "", members: [] })}
        className="spring-tap w-full rounded-2xl py-3 text-sm font-semibold text-white"
        style={{ background: "var(--gradient-primary)" }}>
        + New group
      </button>
    </div>
  );
}

function GroupEditor({ group, onCancel, onSave }: {
  group: SplitGroup; onCancel: () => void; onSave: (g: SplitGroup) => void;
}) {
  const [name, setName] = useState(group.name);
  const [members, setMembers] = useState<SplitMember[]>(group.members);
  const [code, setCode] = useState("");
  const [looking, setLooking] = useState(false);

  const addMember = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return toast.error("Enter a wallet code");
    if (members.some((m) => m.code === c)) return toast.error("Already in group");
    setLooking(true);
    const { data, error } = await supabase.rpc("lookup_wallet_by_code", { p_code: c });
    setLooking(false);
    if (error) return toast.error(error.message);
    if (!data) return toast.error("No wallet found");
    const info = data as { full_name: string };
    setMembers((m) => [...m, { code: c, name: info.full_name }]);
    setCode("");
  };

  const save = () => {
    if (!name.trim()) return toast.error("Name your group");
    if (members.length === 0) return toast.error("Add at least one member");
    onSave({ ...group, name: name.trim(), members });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">{group.name ? "Edit group" : "New group"}</h3>
        <button onClick={onCancel} className="text-xs text-muted-foreground spring-tap">Cancel</button>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-1.5">Group name</div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Padel buddies"
          className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-1.5">Add member by wallet code</div>
        <div className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD1234EFGH"
            className="flex-1 rounded-2xl border border-border bg-white px-4 py-3 font-mono uppercase outline-none focus:border-primary" />
          <button onClick={addMember} disabled={looking}
            className="spring-tap rounded-2xl px-4 text-sm font-semibold bg-primary-tint text-primary">
            {looking ? <Loader2 size={16} className="animate-spin" /> : "Add"}
          </button>
        </div>
      </div>
      {members.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs text-muted-foreground">Members</div>
          {members.map((m) => (
            <div key={m.code} className="flex items-center justify-between rounded-xl bg-white border border-border px-3 py-2">
              <div>
                <div className="text-sm font-semibold">{m.name}</div>
                <div className="text-[11px] text-muted-foreground font-mono">{m.code}</div>
              </div>
              <button onClick={() => setMembers((arr) => arr.filter((x) => x.code !== m.code))}
                className="spring-tap p-1.5 rounded-full hover:bg-muted text-destructive">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <button onClick={save} className="spring-tap w-full rounded-2xl py-3 text-sm font-semibold text-white"
        style={{ background: "var(--gradient-primary)" }}>
        Save group
      </button>
    </div>
  );
}
