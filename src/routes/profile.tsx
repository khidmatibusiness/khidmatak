import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera, Settings, LogOut, ChevronRight, Languages, Copy, Wallet as WalletIcon, Calendar, Users, HelpCircle, Share2, Loader2, Phone } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Khidmati · Profile" },
      { name: "description", content: "Manage your Khidmati account, wallet and referrals." },
    ],
  }),
  component: ProfilePage,
});

interface ProfileData {
  full_name: string | null;
  phone: string | null;
  created_at: string | null;
  wallet_code: string | null;
  balance: number;
}

function ProfilePage() {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRefer, setShowRefer] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const [{ data: u }, { data: w }] = await Promise.all([
        supabase.from("users").select("full_name,phone,created_at").eq("id", user.id).maybeSingle(),
        supabase.from("wallets").select("wallet_code,balance").eq("user_id", user.id).maybeSingle(),
      ]);
      setData({
        full_name: u?.full_name ?? user.email ?? null,
        phone: u?.phone ?? null,
        created_at: u?.created_at ?? null,
        wallet_code: w?.wallet_code ?? null,
        balance: Number(w?.balance ?? 0),
      });
      setLoading(false);
    })();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success(lang === "ar" ? "تم تسجيل الخروج" : "Logged out");
    navigate({ to: "/welcome" });
  };

  if (loading) {
    return (
      <div className="px-5 pt-8 pb-8 space-y-5">
        <div className="h-7 w-32 rounded-xl bg-muted animate-pulse" />
        <ProfileSkeleton />
      </div>
    );
  }

  const name = data?.full_name ?? (lang === "ar" ? "المستخدم" : "User");
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  const memberSince = data?.created_at ? new Date(data.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "—";

  return (
    <div className="px-5 pt-8 pb-8 space-y-5 animate-fade-up">
      <h1 className="text-2xl font-bold tracking-tight">{t("profile")}</h1>

      <div className="glass rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white"
              style={{ background: "var(--gradient-primary)" }}
            >
              {initial}
            </div>
            <button
              onClick={() => toast(lang === "ar" ? "قريباً" : "Photo upload coming soon")}
              className="spring-tap absolute -bottom-1 -right-1 rounded-full bg-white shadow-md p-1.5 text-primary border border-border"
              aria-label="Edit photo"
            >
              <Camera size={14} />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg leading-tight truncate">{name}</div>
            {data?.phone && (
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Phone size={11} /> {data.phone}
              </div>
            )}
            <div className="text-[11px] text-muted-foreground mt-1">
              {lang === "ar" ? "عضو منذ" : "Member since"} {memberSince}
            </div>
          </div>
        </div>

        <Link
          to="/wallet"
          className="spring-tap rounded-2xl bg-primary-tint p-3 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-white text-primary flex items-center justify-center"><WalletIcon size={18} /></div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{lang === "ar" ? "رصيد المحفظة" : "Wallet balance"}</div>
            <div className="font-bold text-lg">{data?.balance.toFixed(2)} <span className="text-xs font-medium">JOD</span></div>
          </div>
          <ChevronRight size={16} className="text-muted-foreground rtl:rotate-180" />
        </Link>
      </div>

      <div className="glass rounded-3xl divide-y divide-border overflow-hidden">
        <MenuLink to="/bookings" icon={<Calendar size={18} />} label={lang === "ar" ? "حجوزاتي" : "My Bookings"} />
        <MenuLink to="/wallet" icon={<WalletIcon size={18} />} label={lang === "ar" ? "المحفظة" : "Wallet"} />
        <MenuButton onClick={() => setShowRefer(true)} icon={<Users size={18} />} label={lang === "ar" ? "ادعُ صديقاً" : "Refer a Friend"} />
        <MenuButton
          onClick={() => setLang(lang === "en" ? "ar" : "en")}
          icon={<Languages size={18} />}
          label={t("language")}
          right={<span className="text-xs font-semibold text-muted-foreground">{lang === "en" ? "English" : "العربية"}</span>}
        />
        <MenuButton onClick={() => toast(lang === "ar" ? "قريباً" : "Settings coming soon")} icon={<Settings size={18} />} label={lang === "ar" ? "الإعدادات" : "Settings"} />
        <MenuButton onClick={() => toast(lang === "ar" ? "قريباً" : "Help coming soon")} icon={<HelpCircle size={18} />} label={lang === "ar" ? "المساعدة" : "Help"} />
      </div>

      <button
        onClick={logout}
        className="spring-tap glass rounded-3xl p-4 w-full flex items-center gap-3 text-destructive"
      >
        <LogOut size={18} />
        <span className="flex-1 text-sm font-semibold text-start">{t("logout")}</span>
        <ChevronRight size={16} className="rtl:rotate-180" />
      </button>

      {showRefer && data?.wallet_code && (
        <ReferSheet code={data.wallet_code} onClose={() => setShowRefer(false)} lang={lang} />
      )}
    </div>
  );
}

function MenuLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="spring-tap w-full flex items-center gap-3 p-4 hover:bg-primary-tint">
      <span className="text-primary">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronRight size={16} className="text-muted-foreground rtl:rotate-180" />
    </Link>
  );
}

function MenuButton({ onClick, icon, label, right }: { onClick: () => void; icon: React.ReactNode; label: string; right?: React.ReactNode }) {
  return (
    <button onClick={onClick} className="spring-tap w-full flex items-center gap-3 p-4 text-start hover:bg-primary-tint">
      <span className="text-primary">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {right}
      <ChevronRight size={16} className="text-muted-foreground rtl:rotate-180" />
    </button>
  );
}

function ReferSheet({ code, onClose, lang }: { code: string; onClose: () => void; lang: string }) {
  const message = lang === "ar"
    ? `انضم إلي على خدماتي! استخدم رمز الإحالة الخاص بي ${code} واحصل على 2 دينار في محفظتك.`
    : `Join me on Khidmati! Use my referral code ${code} to get 2 JOD in your wallet.`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(lang === "ar" ? "تم النسخ" : "Code copied");
    } catch {
      toast.error(lang === "ar" ? "تعذر النسخ" : "Couldn't copy");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md bg-background rounded-t-3xl p-6 space-y-4 animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="text-center space-y-1">
          <div className="text-lg font-bold">{lang === "ar" ? "ادعُ صديقاً" : "Refer a friend"}</div>
          <div className="text-xs text-muted-foreground">
            {lang === "ar" ? "تحصل أنت وصديقك على 2 دينار عند تسجيله" : "You and your friend each get 2 JOD when they sign up"}
          </div>
        </div>
        <div className="rounded-2xl bg-primary-tint p-4 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{lang === "ar" ? "رمز الإحالة" : "Referral code"}</div>
          <div className="font-mono font-bold text-2xl mt-1">{code}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={copy} className="spring-tap rounded-2xl py-3 text-sm font-semibold flex items-center justify-center gap-2 bg-white border border-border">
            <Copy size={16} /> {lang === "ar" ? "نسخ" : "Copy"}
          </button>
          <a href={waUrl} target="_blank" rel="noreferrer" className="spring-tap rounded-2xl py-3 text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ background: "var(--gradient-primary)" }}>
            <Share2 size={16} /> {lang === "ar" ? "واتساب" : "WhatsApp"}
          </a>
        </div>
        <button onClick={onClose} className="w-full text-xs text-muted-foreground py-2">{lang === "ar" ? "إغلاق" : "Close"}</button>
      </div>
    </div>
  );
}
