import { createFileRoute } from "@tanstack/react-router";
import {
  Plus, Send, Users, ArrowUpRight, ArrowDownLeft, PiggyBank, Eye, EyeOff,
  X, Check, Clock, Trash2, UserPlus,
} from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { transactions } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Khidmati · Wallet" },
      { name: "description", content: "Top up, transfer and split with the Khidmati escrow-protected wallet." },
    ],
  }),
  component: WalletPage,
});

interface PendingReq {
  id: string;
  type: "incoming" | "outgoing";
  who: string;
  emoji: string;
  amount: number;
  note: string;
}

interface SplitGroup {
  id: string;
  name: string;
  emoji: string;
  codes: string[];
}

const initialPending: PendingReq[] = [
  { id: "p1", type: "incoming", who: "Omar", emoji: "🎾", amount: 6, note: "Padel split" },
  { id: "p2", type: "outgoing", who: "Lina", emoji: "🍕", amount: 4.5, note: "Pizza last night" },
];

const initialGroups: SplitGroup[] = [
  { id: "g1", name: "Padel gang", emoji: "🎾", codes: ["KH-OMR-22", "KH-LNA-71", "KH-YZN-04"] },
  { id: "g2", name: "Roomies", emoji: "🏠", codes: ["KH-SRA-19", "KH-MNA-88"] },
];

function WalletPage() {
  const { t } = useI18n();
  const [showCode, setShowCode] = useState(false);
  const [pending, setPending] = useState<PendingReq[]>(initialPending);
  const [groups, setGroups] = useState<SplitGroup[]>(initialGroups);
  const [sheet, setSheet] = useState<null | "topup" | "transfer" | "split" | "newGroup">(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCodes, setNewGroupCodes] = useState<string[]>([""]);
  const balance = 142.75;
  const roundUp = 8.4;
  const roundUpGoal = 20;
  const pct = Math.min(100, (roundUp / roundUpGoal) * 100);

  const handleResolve = (id: string, action: "accept" | "decline" | "withdraw") => {
    setPending((p) => p.filter((x) => x.id !== id));
    toast.success(
      action === "accept" ? "Payment accepted" : action === "decline" ? "Request declined" : "Funds withdrawn"
    );
  };

  const saveGroup = () => {
    if (!newGroupName.trim()) return toast.error("Add a group name");
    const codes = newGroupCodes.map((c) => c.trim()).filter(Boolean);
    if (codes.length < 1) return toast.error("Add at least one code");
    setGroups((g) => [
      { id: `g${Date.now()}`, name: newGroupName, emoji: "👥", codes },
      ...g,
    ]);
    setNewGroupName("");
    setNewGroupCodes([""]);
    setSheet("split");
    toast.success("Group saved");
  };

  return (
    <>
    <div className="px-5 pt-8 space-y-5 animate-fade-up">
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
              <div className="font-mono text-sm font-semibold">{showCode ? "KH-7F2A-91X" : "•••• •••• ••"}</div>
            </div>
            <button onClick={() => setShowCode((v) => !v)} className="spring-tap p-2 rounded-xl bg-primary-tint text-primary">
              {showCode ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Plus size={20} />, label: t("topUp"), key: "topup" as const },
          { icon: <Send size={20} />, label: t("transfer"), key: "transfer" as const },
          { icon: <Users size={20} />, label: t("split"), key: "split" as const },
        ].map((a) => (
          <button
            key={a.key}
            onClick={() => setSheet(a.key)}
            className="spring-tap glass rounded-2xl p-3 flex flex-col items-center gap-1.5"
          >
            <span className="rounded-xl bg-primary-tint text-primary p-2">{a.icon}</span>
            <span className="text-xs font-medium">{a.label}</span>
          </button>
        ))}
      </div>

      {/* round up */}
      <div className="glass-tint rounded-3xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary text-primary-foreground p-2.5">
            <PiggyBank size={20} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">{t("roundUp")}</div>
            <div className="text-xs text-muted-foreground">{roundUp.toFixed(2)} / {roundUpGoal} JOD</div>
          </div>
          <button
            onClick={() => toast.success(`${roundUp.toFixed(2)} JOD moved to wallet`)}
            className="spring-tap text-xs font-semibold text-primary"
          >
            {t("transferToMain")}
          </button>
        </div>
        <div className="h-2 rounded-full bg-white overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--gradient-primary)" }} />
        </div>
      </div>

      {/* pending requests */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-2 px-1 flex items-center gap-2">
            <Clock size={14} className="text-primary" /> {t("pendingReq")}
          </h2>
          <div className="glass rounded-3xl divide-y divide-border overflow-hidden">
            {pending.map((p) => (
              <div key={p.id} className="p-3.5 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="text-xl">{p.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {p.type === "incoming" ? `${p.who} requested` : `Sent to ${p.who}`}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {p.note} · {p.type === "outgoing" ? t("awaiting") : ""}
                    </div>
                  </div>
                  <div
                    className="text-sm font-semibold"
                    style={{ color: p.type === "incoming" ? "var(--color-destructive)" : "var(--color-primary)" }}
                  >
                    {p.type === "incoming" ? "-" : "+"}{p.amount.toFixed(2)}
                  </div>
                </div>
                <div className="flex gap-2">
                  {p.type === "incoming" ? (
                    <>
                      <button
                        onClick={() => handleResolve(p.id, "decline")}
                        className="spring-tap flex-1 rounded-xl py-2 text-xs font-medium border border-border flex items-center justify-center gap-1"
                      >
                        <X size={13} /> {t("decline")}
                      </button>
                      <button
                        onClick={() => handleResolve(p.id, "accept")}
                        className="spring-tap flex-1 rounded-xl py-2 text-xs font-semibold bg-primary text-primary-foreground flex items-center justify-center gap-1"
                      >
                        <Check size={13} /> {t("accept")}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleResolve(p.id, "withdraw")}
                      className="spring-tap flex-1 rounded-xl py-2 text-xs font-semibold bg-primary-tint text-primary flex items-center justify-center gap-1"
                    >
                      <ArrowDownLeft size={13} /> {t("withdraw")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* transactions */}
      <div>
        <h2 className="text-sm font-semibold mb-2 px-1">{t("recent")}</h2>
        <div className="glass rounded-3xl divide-y divide-border overflow-hidden">
          {transactions.map((tx) => {
            const credit = tx.amount > 0;
            return (
              <div key={tx.id} className="flex items-center gap-3 p-3.5">
                <div className="text-xl">{tx.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{tx.label}</div>
                  <div className="text-[11px] text-muted-foreground">{tx.date}</div>
                </div>
                <div
                  className="text-sm font-semibold flex items-center gap-1"
                  style={{ color: credit ? "var(--color-primary)" : "var(--color-destructive)" }}
                >
                  {credit ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                  {credit ? "+" : ""}
                  {tx.amount.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SHEETS */}
      {sheet && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center" onClick={() => setSheet(null)}>
          <div className="absolute inset-0 bg-black/40 animate-fade-up" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md glass-strong rounded-t-3xl p-5 pb-8 animate-fade-up max-h-[85vh] overflow-y-auto"
          >
            <div className="mx-auto h-1.5 w-10 rounded-full bg-muted mb-4" />

            {sheet === "topup" && (
              <TopUpSheet onDone={() => setSheet(null)} />
            )}
            {sheet === "transfer" && (
              <TransferSheet onDone={() => setSheet(null)} />
            )}
            {sheet === "split" && (
              <SplitSheet
                groups={groups}
                onDelete={(id) => { setGroups((g) => g.filter((x) => x.id !== id)); toast("Group removed"); }}
                onUseGroup={(g) => { toast.success(`Saved as default: ${g.name}`); setSheet(null); }}
                onCreate={() => setSheet("newGroup")}
              />
            )}
            {sheet === "newGroup" && (
              <NewGroupSheet
                name={newGroupName}
                setName={setNewGroupName}
                codes={newGroupCodes}
                setCodes={setNewGroupCodes}
                onSave={saveGroup}
                onBack={() => setSheet("split")}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TopUpSheet({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [amount, setAmount] = useState("20");
  const [method, setMethod] = useState<"cliq" | "card">("cliq");
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">{t("topUp")}</h3>
      <div>
        <div className="text-xs text-muted-foreground mb-1.5">Amount (JOD)</div>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-lg font-semibold outline-none focus:border-primary"
        />
        <div className="flex gap-2 mt-2">
          {[10, 20, 50, 100].map((v) => (
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
      <div className="grid grid-cols-2 gap-2">
        {(["cliq", "card"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className="spring-tap rounded-2xl py-3 text-sm font-semibold border-2"
            style={{
              borderColor: method === m ? "var(--color-primary)" : "var(--color-border)",
              background: method === m ? "var(--color-primary-tint)" : "white",
              color: method === m ? "var(--color-primary)" : "var(--color-foreground)",
            }}
          >
            {m === "cliq" ? "CliQ" : "Card"}
          </button>
        ))}
      </div>
      <button
        onClick={() => { toast.success(`Top up ${amount} JOD via ${method.toUpperCase()}`); onDone(); }}
        className="spring-tap w-full rounded-2xl py-3.5 text-sm font-semibold text-white"
        style={{ background: "var(--gradient-primary)" }}
      >
        Confirm top up
      </button>
    </div>
  );
}

function TransferSheet({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">{t("transfer")}</h3>
      <div>
        <div className="text-xs text-muted-foreground mb-1.5">{t("privateCode")}</div>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="KH-XXXX-XXX"
          className="w-full rounded-2xl border border-border bg-white px-4 py-3 font-mono outline-none focus:border-primary"
        />
      </div>
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
        onClick={() => {
          if (!code || !amount) return toast.error("Fill code and amount");
          toast.success(`${amount} JOD sent to ${code}`);
          onDone();
        }}
        className="spring-tap w-full rounded-2xl py-3.5 text-sm font-semibold text-white"
        style={{ background: "var(--gradient-primary)" }}
      >
        Send transfer
      </button>
    </div>
  );
}

function SplitSheet({
  groups, onDelete, onUseGroup, onCreate,
}: {
  groups: SplitGroup[];
  onDelete: (id: string) => void;
  onUseGroup: (g: SplitGroup) => void;
  onCreate: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">{t("splitGroups")}</h3>
        <button
          onClick={onCreate}
          className="spring-tap rounded-full bg-primary text-primary-foreground px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1"
        >
          <UserPlus size={14} /> {t("newGroup")}
        </button>
      </div>
      {groups.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-8">No groups yet — create one</div>
      )}
      <div className="space-y-2">
        {groups.map((g) => (
          <div key={g.id} className="glass rounded-2xl p-3 flex items-center gap-3">
            <div className="text-2xl">{g.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{g.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                {g.codes.length} {t("members")} · {g.codes.slice(0, 2).join(", ")}{g.codes.length > 2 ? "…" : ""}
              </div>
            </div>
            <button
              onClick={() => onUseGroup(g)}
              className="spring-tap rounded-xl bg-primary-tint text-primary text-xs font-semibold px-3 py-2"
            >
              Use
            </button>
            <button
              onClick={() => onDelete(g.id)}
              className="spring-tap p-2 text-muted-foreground"
              aria-label="Delete"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewGroupSheet({
  name, setName, codes, setCodes, onSave, onBack,
}: {
  name: string;
  setName: (v: string) => void;
  codes: string[];
  setCodes: (v: string[]) => void;
  onSave: () => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">{t("newGroup")}</h3>
        <button onClick={onBack} className="text-xs text-primary font-semibold">← Back</button>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-1.5">{t("groupName")}</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Padel gang"
          className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none focus:border-primary"
        />
      </div>
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Member codes</div>
        {codes.map((c, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={c}
              onChange={(e) => {
                const n = [...codes]; n[i] = e.target.value; setCodes(n);
              }}
              placeholder="KH-XXXX-XXX"
              className="flex-1 rounded-2xl border border-border bg-white px-4 py-2.5 font-mono text-sm outline-none focus:border-primary"
            />
            {codes.length > 1 && (
              <button
                onClick={() => setCodes(codes.filter((_, j) => j !== i))}
                className="spring-tap p-2 text-muted-foreground"
                aria-label="Remove"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setCodes([...codes, ""])}
          className="spring-tap w-full rounded-2xl py-2.5 text-xs font-semibold border border-dashed border-border text-primary"
        >
          + {t("addCode")}
        </button>
      </div>
      <button
        onClick={onSave}
        className="spring-tap w-full rounded-2xl py-3.5 text-sm font-semibold text-white"
        style={{ background: "var(--gradient-primary)" }}
      >
        {t("save")}
      </button>
    </div>
  );
}
