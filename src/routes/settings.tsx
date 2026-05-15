import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Search, User, CreditCard, Bell, Shield, Palette, HelpCircle,
  Globe, LogOut, ChevronRight, Camera, Lock, Smartphone, Mail, Phone,
  Eye, EyeOff, Check, X, Trash2, Download, AlertTriangle, MessageSquare,
  FileText, Info, Languages, MapPin, Clock, Calendar, Wallet as WalletIcon,
  Tag, History, Plus, Sun, Moon, Monitor, Type, Volume2, Vibrate, KeyRound,
  Fingerprint, ShieldAlert, Loader2, ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Khidmati · Settings" },
      { name: "description", content: "Manage your Khidmati account, preferences, notifications and security." },
    ],
  }),
  component: SettingsPage,
});

// ---------- Persistent settings store ----------
type Prefs = {
  currency: "JOD" | "USD" | "EUR" | "SAR" | "AED";
  defaultAddress: string;
  timeFormat: "12h" | "24h";
  calendarSync: boolean;
  notif: { push: boolean; sms: boolean; email: boolean; reminders: boolean; promos: boolean; messages: boolean };
  sound: boolean;
  vibration: boolean;
  theme: "light" | "dark" | "system";
  fontScale: number; // 0.85 - 1.3
  reduceMotion: boolean;
  highContrast: boolean;
  biometric: boolean;
  sessionTimeout: 0 | 5 | 15 | 30 | 60; // minutes
  language: "en" | "ar";
  region: string;
};

const DEFAULTS: Prefs = {
  currency: "JOD",
  defaultAddress: "",
  timeFormat: "12h",
  calendarSync: false,
  notif: { push: true, sms: false, email: true, reminders: true, promos: false, messages: true },
  sound: true,
  vibration: true,
  theme: "system",
  fontScale: 1,
  reduceMotion: false,
  highContrast: false,
  biometric: false,
  sessionTimeout: 30,
  language: "en",
  region: "Jordan",
};

const STORAGE_KEY = "khidmati:settings:v1";

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}
function savePrefs(p: Prefs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}

function applyTheme(theme: Prefs["theme"]) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const wantDark = theme === "dark" || (theme === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", !!wantDark);
}
function applyFontScale(scale: number) {
  if (typeof document === "undefined") return;
  document.documentElement.style.fontSize = `${Math.round(16 * scale)}px`;
}

// ---------- Page ----------
function SettingsPage() {
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState<{ full_name: string; phone: string; email: string; username: string }>({
    full_name: "", phone: "", email: "", username: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  // Hydrate
  useEffect(() => {
    const p = loadPrefs();
    setPrefs(p);
    applyTheme(p.theme);
    applyFontScale(p.fontScale);
    if (p.language !== lang) setLang(p.language);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: u } = await supabase.from("users").select("full_name,phone").eq("id", user.id).maybeSingle();
        setProfile({
          full_name: u?.full_name ?? "",
          phone: u?.phone ?? "",
          email: user.email ?? "",
          username: (user.email?.split("@")[0]) ?? "",
        });
      }
      setLoading(false);
    })();
    // System theme listener
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = () => { if (loadPrefs().theme === "system") applyTheme("system"); };
    mq?.addEventListener?.("change", onChange);
    return () => mq?.removeEventListener?.("change", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      savePrefs(next);
      if (key === "theme") applyTheme(value as Prefs["theme"]);
      if (key === "fontScale") applyFontScale(value as number);
      if (key === "language") setLang(value as "en" | "ar");
      return next;
    });
    haptic("light");
  };

  const updateNotif = (k: keyof Prefs["notif"], v: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, notif: { ...prev.notif, [k]: v } };
      savePrefs(next);
      return next;
    });
    haptic("light");
  };

  const validateProfile = () => {
    if (!profile.full_name.trim() || profile.full_name.length > 100) return "Enter a valid name";
    if (profile.phone && !/^\+?[0-9\s-]{6,20}$/.test(profile.phone)) return "Invalid phone number";
    return null;
  };

  const saveProfile = async () => {
    const err = validateProfile();
    if (err) { toast.error(err); return; }
    setSavingProfile(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingProfile(false); toast.error("Not signed in"); return; }
    const { error } = await supabase.from("users").update({
      full_name: profile.full_name.trim(),
      phone: profile.phone.trim() || null,
    }).eq("id", user.id);
    setSavingProfile(false);
    if (error) toast.error(error.message);
    else { toast.success(lang === "ar" ? "تم الحفظ" : "Profile saved"); haptic("success"); }
  };

  const changePassword = async (newPwd: string) => {
    if (newPwd.length < 8) { toast.error("Password must be 8+ characters"); return false; }
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    if (error) { toast.error(error.message); return false; }
    toast.success(lang === "ar" ? "تم تحديث كلمة المرور" : "Password updated");
    haptic("success");
    return true;
  };

  const requestPasswordReset = async () => {
    if (!profile.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    if (error) toast.error(error.message); else toast.success("Reset link sent to " + profile.email);
  };

  const logout = async () => {
    haptic("warning");
    await supabase.auth.signOut();
    toast.success(lang === "ar" ? "تم تسجيل الخروج" : "Logged out");
    navigate({ to: "/welcome" });
  };

  const logoutAllDevices = async () => {
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) toast.error(error.message);
    else { toast.success("Signed out from all devices"); navigate({ to: "/welcome" }); }
  };

  const downloadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: u }, { data: w }, { data: b }] = await Promise.all([
      supabase.from("users").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("bookings").select("*").eq("customer_id", user.id),
    ]);
    const blob = new Blob([JSON.stringify({ user: u, wallet: w, bookings: b }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `khidmati-data-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Data downloaded");
  };

  const clearCache = () => {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith("khidmati:cache"));
      keys.forEach((k) => localStorage.removeItem(k));
      if ("caches" in window) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k)));
      toast.success(lang === "ar" ? "تم مسح الذاكرة" : "Cache cleared");
    } catch { toast.error("Couldn't clear cache"); }
  };

  // Sections for search filtering
  const sections = useMemo(() => [
    { id: "account", title: lang === "ar" ? "الحساب" : "Account", icon: User },
    { id: "booking", title: lang === "ar" ? "تفضيلات الحجز" : "Booking Preferences", icon: Calendar },
    { id: "payment", title: lang === "ar" ? "الدفع" : "Payment", icon: CreditCard },
    { id: "notifications", title: lang === "ar" ? "الإشعارات" : "Notifications", icon: Bell },
    { id: "privacy", title: lang === "ar" ? "الخصوصية والأمان" : "Privacy & Security", icon: Shield },
    { id: "appearance", title: lang === "ar" ? "المظهر" : "Appearance", icon: Palette },
    { id: "general", title: lang === "ar" ? "إعدادات عامة" : "General", icon: Globe },
    { id: "support", title: lang === "ar" ? "الدعم" : "Support & Help", icon: HelpCircle },
  ], [lang]);

  const q = search.trim().toLowerCase();
  const showSection = (id: string, ...keywords: string[]) =>
    !q || id.includes(q) || keywords.some((k) => k.toLowerCase().includes(q));

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header search={search} setSearch={setSearch} onBack={() => navigate({ to: "/profile" })} />
        <div className="px-5 pt-4 pb-24 space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-32 rounded-3xl bg-muted animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-[max(env(safe-area-inset-bottom),24px)]">
      <Header search={search} setSearch={setSearch} onBack={() => navigate({ to: "/profile" })} />

      <main className="px-5 pt-4 pb-10 space-y-5 animate-fade-up max-w-2xl mx-auto">
        {/* Quick jump */}
        {!q && (
          <div className="grid grid-cols-4 gap-2">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="spring-tap glass rounded-2xl p-3 flex flex-col items-center gap-1.5 text-center">
                <s.icon size={18} className="text-primary" />
                <span className="text-[10px] font-medium leading-tight">{s.title}</span>
              </a>
            ))}
          </div>
        )}

        {/* ACCOUNT */}
        {showSection("account", "profile", "name", "email", "phone", "password", "2fa", lang === "ar" ? "حساب" : "account") && (
          <Section id="account" icon={<User size={16} />} title={lang === "ar" ? "إعدادات الحساب" : "Account Settings"}>
            <div className="flex items-center gap-4 p-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white" style={{ background: "var(--gradient-primary)" }}>
                  {(profile.full_name.trim()[0] ?? "?").toUpperCase()}
                </div>
                <button onClick={() => toast(lang === "ar" ? "قريباً" : "Photo upload coming soon")} className="spring-tap absolute -bottom-1 -right-1 rounded-full bg-white shadow-md p-1.5 text-primary border border-border">
                  <Camera size={12} />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{profile.full_name || (lang === "ar" ? "مستخدم" : "User")}</div>
                <div className="text-xs text-muted-foreground truncate">{profile.email}</div>
              </div>
            </div>
            <div className="px-4 pb-4 space-y-3">
              <Field label={lang === "ar" ? "الاسم الكامل" : "Full name"}>
                <input className="settings-input" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} maxLength={100} />
              </Field>
              <Field label={lang === "ar" ? "اسم المستخدم" : "Username"}>
                <input className="settings-input" value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} maxLength={30} />
              </Field>
              <Field label="Email" icon={<Mail size={14} />}>
                <input className="settings-input opacity-60" value={profile.email} disabled />
              </Field>
              <Field label={lang === "ar" ? "الهاتف" : "Phone"} icon={<Phone size={14} />}>
                <input className="settings-input" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+962…" />
              </Field>
              <button onClick={saveProfile} disabled={savingProfile} className="spring-tap w-full rounded-2xl py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: "var(--gradient-primary)" }}>
                {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {lang === "ar" ? "حفظ التغييرات" : "Save changes"}
              </button>
            </div>
            <Divider />
            <Row icon={<KeyRound size={16} />} label={lang === "ar" ? "تغيير كلمة المرور" : "Change password"} onClick={() => setShowPwd(true)} />
            <Row icon={<Mail size={16} />} label={lang === "ar" ? "إرسال رابط إعادة تعيين" : "Email me a reset link"} onClick={requestPasswordReset} />
            <ToggleRow icon={<ShieldAlert size={16} />} label={lang === "ar" ? "المصادقة الثنائية (2FA)" : "Two-factor authentication"} value={false} onChange={() => toast(lang === "ar" ? "قريباً" : "2FA coming soon")} />
          </Section>
        )}

        {/* BOOKING */}
        {showSection("booking", "currency", "address", "time", "calendar") && (
          <Section id="booking" icon={<Calendar size={16} />} title={lang === "ar" ? "تفضيلات الحجز" : "Booking Preferences"}>
            <SelectRow icon={<WalletIcon size={16} />} label={lang === "ar" ? "العملة" : "Currency"} value={prefs.currency} onChange={(v) => update("currency", v as Prefs["currency"])} options={["JOD", "USD", "EUR", "SAR", "AED"]} />
            <Field className="px-4 py-3" label={lang === "ar" ? "العنوان الافتراضي" : "Default service location"} icon={<MapPin size={14} />}>
              <input className="settings-input" value={prefs.defaultAddress} onChange={(e) => update("defaultAddress", e.target.value)} placeholder={lang === "ar" ? "مثال: عمّان، الدوار الخامس" : "e.g. Amman, 5th Circle"} />
            </Field>
            <SelectRow icon={<Clock size={16} />} label={lang === "ar" ? "تنسيق الوقت" : "Time format"} value={prefs.timeFormat} onChange={(v) => update("timeFormat", v as Prefs["timeFormat"])} options={["12h", "24h"]} />
            <ToggleRow icon={<Calendar size={16} />} label={lang === "ar" ? "مزامنة التقويم" : "Calendar sync"} value={prefs.calendarSync} onChange={(v) => update("calendarSync", v)} />
          </Section>
        )}

        {/* PAYMENT */}
        {showSection("payment", "card", "wallet", "promo", "billing") && (
          <Section id="payment" icon={<CreditCard size={16} />} title={lang === "ar" ? "الدفع" : "Payment"}>
            <Row icon={<CreditCard size={16} />} label={lang === "ar" ? "طرق الدفع المحفوظة" : "Saved payment methods"} sub={lang === "ar" ? "لا توجد بطاقات" : "No cards yet"} right={<Plus size={16} />} onClick={() => toast(lang === "ar" ? "قريباً" : "Add card coming soon")} />
            <Row icon={<Smartphone size={16} />} label="Apple Pay" sub={lang === "ar" ? "غير متصل" : "Not connected"} onClick={() => toast(lang === "ar" ? "قريباً" : "Apple Pay coming soon")} />
            <Row icon={<Smartphone size={16} />} label="Google Pay" sub={lang === "ar" ? "غير متصل" : "Not connected"} onClick={() => toast(lang === "ar" ? "قريباً" : "Google Pay coming soon")} />
            <Row icon={<MapPin size={16} />} label={lang === "ar" ? "عنوان الفوترة" : "Billing address"} onClick={() => toast(lang === "ar" ? "قريباً" : "Coming soon")} />
            <RowLink to="/wallet" icon={<WalletIcon size={16} />} label={lang === "ar" ? "المحفظة" : "Wallet & balance"} />
            <RowLink to="/bookings" icon={<History size={16} />} label={lang === "ar" ? "سجل المعاملات" : "Transaction history"} />
            <Row icon={<Tag size={16} />} label={lang === "ar" ? "أكواد الخصم" : "Promo codes"} onClick={() => toast(lang === "ar" ? "قريباً" : "Promo codes coming soon")} />
            <div className="px-4 py-3 text-[11px] text-muted-foreground flex items-center gap-2">
              <Lock size={12} /> {lang === "ar" ? "جميع المدفوعات مشفرة بنظام TLS وPCI-DSS" : "All payments are TLS + PCI-DSS encrypted"}
            </div>
          </Section>
        )}

        {/* NOTIFICATIONS */}
        {showSection("notifications", "push", "sms", "email", "sound") && (
          <Section id="notifications" icon={<Bell size={16} />} title={lang === "ar" ? "الإشعارات" : "Notifications"}>
            <ToggleRow icon={<Bell size={16} />} label={lang === "ar" ? "الإشعارات الفورية" : "Push notifications"} value={prefs.notif.push} onChange={(v) => updateNotif("push", v)} />
            <ToggleRow icon={<MessageSquare size={16} />} label="SMS" value={prefs.notif.sms} onChange={(v) => updateNotif("sms", v)} />
            <ToggleRow icon={<Mail size={16} />} label="Email" value={prefs.notif.email} onChange={(v) => updateNotif("email", v)} />
            <ToggleRow icon={<Calendar size={16} />} label={lang === "ar" ? "تذكير الحجوزات" : "Booking reminders"} value={prefs.notif.reminders} onChange={(v) => updateNotif("reminders", v)} />
            <ToggleRow icon={<Tag size={16} />} label={lang === "ar" ? "العروض الترويجية" : "Promotional offers"} value={prefs.notif.promos} onChange={(v) => updateNotif("promos", v)} />
            <ToggleRow icon={<MessageSquare size={16} />} label={lang === "ar" ? "رسائل المزودين" : "Provider messages"} value={prefs.notif.messages} onChange={(v) => updateNotif("messages", v)} />
            <Divider />
            <ToggleRow icon={<Volume2 size={16} />} label={lang === "ar" ? "الصوت" : "Sound"} value={prefs.sound} onChange={(v) => update("sound", v)} />
            <ToggleRow icon={<Vibrate size={16} />} label={lang === "ar" ? "الاهتزاز" : "Vibration"} value={prefs.vibration} onChange={(v) => update("vibration", v)} />
          </Section>
        )}

        {/* PRIVACY */}
        {showSection("privacy", "security", "session", "device", "biometric") && (
          <Section id="privacy" icon={<Shield size={16} />} title={lang === "ar" ? "الخصوصية والأمان" : "Privacy & Security"}>
            <Row icon={<Smartphone size={16} />} label={lang === "ar" ? "الجلسات النشطة" : "Active sessions"} sub={lang === "ar" ? "هذا الجهاز" : "This device"} onClick={() => toast(lang === "ar" ? "جهاز واحد نشط" : "1 active device")} />
            <Row icon={<LogOut size={16} />} label={lang === "ar" ? "تسجيل الخروج من جميع الأجهزة" : "Log out of all devices"} onClick={logoutAllDevices} danger />
            <ToggleRow icon={<Fingerprint size={16} />} label={lang === "ar" ? "Face ID / بصمة" : "Face ID / Fingerprint"} value={prefs.biometric} onChange={(v) => update("biometric", v)} />
            <SelectRow icon={<Clock size={16} />} label={lang === "ar" ? "انتهاء الجلسة (دقيقة)" : "Session timeout (min)"} value={String(prefs.sessionTimeout)} onChange={(v) => update("sessionTimeout", Number(v) as Prefs["sessionTimeout"])} options={["0", "5", "15", "30", "60"]} />
            <Row icon={<Download size={16} />} label={lang === "ar" ? "تنزيل بياناتي" : "Download my data"} onClick={downloadData} />
            <Row icon={<ShieldAlert size={16} />} label={lang === "ar" ? "تنبيهات الأمان" : "Security alerts"} sub={lang === "ar" ? "تشغيل" : "On"} onClick={() => toast("Always on")} />
            <Row icon={<AlertTriangle size={16} />} label={lang === "ar" ? "حظر / إبلاغ مستخدم" : "Block / report user"} onClick={() => toast(lang === "ar" ? "افتح ملف المستخدم للإبلاغ" : "Open a user profile to report")} />
            <Row icon={<Trash2 size={16} />} label={lang === "ar" ? "حذف الحساب" : "Delete account"} onClick={() => setShowDelete(true)} danger />
          </Section>
        )}

        {/* APPEARANCE */}
        {showSection("appearance", "theme", "dark", "light", "font") && (
          <Section id="appearance" icon={<Palette size={16} />} title={lang === "ar" ? "المظهر" : "Appearance"}>
            <div className="px-4 py-3">
              <div className="text-xs font-medium text-muted-foreground mb-2">{lang === "ar" ? "السمة" : "Theme"}</div>
              <div className="grid grid-cols-3 gap-2">
                {([["light", Sun, "Light"], ["dark", Moon, "Dark"], ["system", Monitor, "Auto"]] as const).map(([val, Icon, label]) => (
                  <button key={val} onClick={() => update("theme", val)} className={`spring-tap rounded-2xl p-3 flex flex-col items-center gap-1.5 border ${prefs.theme === val ? "border-primary bg-primary-tint" : "border-border"}`}>
                    <Icon size={18} className={prefs.theme === val ? "text-primary" : ""} />
                    <span className="text-[11px] font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-2"><Type size={14} /> {lang === "ar" ? "حجم الخط" : "Font scale"}</span>
                <span className="text-xs font-bold">{Math.round(prefs.fontScale * 100)}%</span>
              </div>
              <input type="range" min={0.85} max={1.3} step={0.05} value={prefs.fontScale} onChange={(e) => update("fontScale", Number(e.target.value))} className="w-full accent-[var(--primary)]" />
            </div>
            <ToggleRow icon={<Eye size={16} />} label={lang === "ar" ? "تباين عالٍ" : "High contrast"} value={prefs.highContrast} onChange={(v) => update("highContrast", v)} />
            <ToggleRow icon={<Vibrate size={16} />} label={lang === "ar" ? "تقليل الحركة" : "Reduce motion"} value={prefs.reduceMotion} onChange={(v) => update("reduceMotion", v)} />
          </Section>
        )}

        {/* GENERAL */}
        {showSection("general", "language", "region", "cache", "storage") && (
          <Section id="general" icon={<Globe size={16} />} title={lang === "ar" ? "إعدادات عامة" : "General"}>
            <SelectRow icon={<Languages size={16} />} label={lang === "ar" ? "اللغة" : "Language"} value={prefs.language} onChange={(v) => update("language", v as "en" | "ar")} options={["en", "ar"]} labels={{ en: "English", ar: "العربية" }} />
            <SelectRow icon={<Globe size={16} />} label={lang === "ar" ? "البلد / المنطقة" : "Country / Region"} value={prefs.region} onChange={(v) => update("region", v)} options={["Jordan", "Saudi Arabia", "UAE", "Egypt", "Lebanon"]} />
            <Row icon={<Trash2 size={16} />} label={lang === "ar" ? "مسح الذاكرة المؤقتة" : "Clear cache"} onClick={clearCache} />
            <Row icon={<Info size={16} />} label={lang === "ar" ? "إدارة التخزين" : "Storage usage"} sub="< 5 MB" onClick={() => toast(`${(JSON.stringify(localStorage).length / 1024).toFixed(1)} KB used`)} />
          </Section>
        )}

        {/* SUPPORT */}
        {showSection("support", "help", "faq", "contact", "terms") && (
          <Section id="support" icon={<HelpCircle size={16} />} title={lang === "ar" ? "الدعم والمساعدة" : "Support & Help"}>
            <Row icon={<HelpCircle size={16} />} label="FAQ" onClick={() => toast(lang === "ar" ? "قريباً" : "FAQ coming soon")} />
            <Row icon={<MessageSquare size={16} />} label={lang === "ar" ? "الدردشة المباشرة" : "Live chat"} onClick={() => toast(lang === "ar" ? "قريباً" : "Live chat coming soon")} />
            <a href="mailto:support@khidmati.app" className="block">
              <Row icon={<Mail size={16} />} label={lang === "ar" ? "تواصل مع الدعم" : "Contact support"} sub="support@khidmati.app" />
            </a>
            <Row icon={<AlertTriangle size={16} />} label={lang === "ar" ? "الإبلاغ عن مشكلة" : "Report a problem"} onClick={() => toast(lang === "ar" ? "تم الفتح" : "Opening report form…")} />
            <Row icon={<FileText size={16} />} label={lang === "ar" ? "شروط الخدمة" : "Terms of service"} onClick={() => toast(lang === "ar" ? "قريباً" : "Opening…")} />
            <Row icon={<Shield size={16} />} label={lang === "ar" ? "سياسة الخصوصية" : "Privacy policy"} onClick={() => toast(lang === "ar" ? "قريباً" : "Opening…")} />
            <div className="px-4 py-3 text-[11px] text-muted-foreground">{lang === "ar" ? "إصدار التطبيق" : "App version"} · 1.0.0</div>
          </Section>
        )}

        {/* LOGOUT */}
        <button onClick={() => setShowLogout(true)} className="spring-tap glass rounded-3xl p-4 w-full flex items-center gap-3 text-destructive">
          <LogOut size={18} />
          <span className="flex-1 text-sm font-semibold text-start">{lang === "ar" ? "تسجيل الخروج" : "Log out"}</span>
          <ChevronRight size={16} className="rtl:rotate-180" />
        </button>
      </main>

      {/* Modals */}
      {showLogout && (
        <ConfirmModal
          title={lang === "ar" ? "تسجيل الخروج؟" : "Log out?"}
          desc={lang === "ar" ? "سيتم إنهاء جلستك على هذا الجهاز." : "You will be signed out on this device."}
          confirmLabel={lang === "ar" ? "خروج" : "Log out"}
          onConfirm={async () => { setShowLogout(false); await logout(); }}
          onClose={() => setShowLogout(false)}
        />
      )}
      {showDelete && (
        <ConfirmModal
          danger
          title={lang === "ar" ? "حذف الحساب؟" : "Delete account?"}
          desc={lang === "ar" ? "هذا الإجراء لا يمكن التراجع عنه." : "This action is permanent and cannot be undone."}
          confirmLabel={lang === "ar" ? "حذف نهائي" : "Delete forever"}
          onConfirm={() => { setShowDelete(false); toast(lang === "ar" ? "اتصل بالدعم لإكمال الحذف" : "Contact support to complete deletion"); }}
          onClose={() => setShowDelete(false)}
        />
      )}
      {showPwd && <PasswordModal onClose={() => setShowPwd(false)} onSave={changePassword} lang={lang} />}

      <style>{`
        .settings-input {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: color-mix(in oklab, var(--muted) 60%, white);
          font-size: 14px;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
        }
        .settings-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 18%, transparent);
        }
      `}</style>
    </div>
  );
}

// ---------- Sub components ----------
function Header({ search, setSearch, onBack }: { search: string; setSearch: (v: string) => void; onBack: () => void }) {
  const { lang } = useI18n();
  return (
    <header className="sticky top-0 z-30 glass-strong backdrop-blur-xl border-b border-border">
      <div className="px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="spring-tap w-9 h-9 rounded-full bg-white border border-border flex items-center justify-center">
            <ArrowLeft size={16} className="rtl:rotate-180" />
          </button>
          <h1 className="text-xl font-bold flex-1">{lang === "ar" ? "الإعدادات" : "Settings"}</h1>
        </div>
        <div className="mt-3 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === "ar" ? "ابحث في الإعدادات…" : "Search settings…"}
            className="w-full h-10 pl-9 pr-3 rtl:pr-9 rtl:pl-3 rounded-2xl bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>
    </header>
  );
}

function Section({ id, title, icon, children }: { id: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="glass rounded-3xl overflow-hidden scroll-mt-32">
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h2 className="text-sm font-bold tracking-tight">{title}</h2>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function Row({ icon, label, sub, right, onClick, danger }: { icon: React.ReactNode; label: string; sub?: string; right?: React.ReactNode; onClick?: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className="spring-tap w-full flex items-center gap-3 px-4 py-3.5 text-start hover:bg-primary-tint">
      <span className={danger ? "text-destructive" : "text-primary"}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${danger ? "text-destructive" : ""}`}>{label}</div>
        {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
      </div>
      {right ?? <ChevronRight size={16} className="text-muted-foreground rtl:rotate-180" />}
    </button>
  );
}

function RowLink({ to, icon, label, sub }: { to: string; icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <Link to={to} className="spring-tap w-full flex items-center gap-3 px-4 py-3.5 text-start hover:bg-primary-tint">
      <span className="text-primary">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
      </div>
      <ChevronRight size={16} className="text-muted-foreground rtl:rotate-180" />
    </Link>
  );
}

function ToggleRow({ icon, label, value, onChange }: { icon: React.ReactNode; label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="w-full flex items-center gap-3 px-4 py-3.5">
      <span className="text-primary">{icon}</span>
      <div className="flex-1 text-sm font-medium">{label}</div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

function SelectRow({ icon, label, value, onChange, options, labels }: { icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; options: string[]; labels?: Record<string, string> }) {
  return (
    <label className="w-full flex items-center gap-3 px-4 py-3.5 cursor-pointer">
      <span className="text-primary">{icon}</span>
      <div className="flex-1 text-sm font-medium">{label}</div>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="appearance-none bg-muted rounded-xl text-xs font-semibold pl-3 pr-7 py-2 outline-none focus:ring-2 focus:ring-primary/30">
          {options.map((o) => <option key={o} value={o}>{labels?.[o] ?? o}</option>)}
        </select>
        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
      </div>
    </label>
  );
}

function Field({ label, icon, children, className = "" }: { label: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">{icon}{label}</div>
      {children}
    </div>
  );
}

function Divider() { return <div className="h-px bg-border mx-4" />; }

function ConfirmModal({ title, desc, confirmLabel, onConfirm, onClose, danger }: { title: string; desc: string; confirmLabel: string; onConfirm: () => void; onClose: () => void; danger?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-fade-up" onClick={onClose}>
      <div className="w-full sm:max-w-sm bg-background rounded-t-3xl sm:rounded-3xl p-6 space-y-4 m-0 sm:m-4" onClick={(e) => e.stopPropagation()}>
        <div className="text-center space-y-1">
          <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ background: danger ? "color-mix(in oklab, var(--destructive) 15%, white)" : "var(--primary-tint)" }}>
            {danger ? <AlertTriangle size={20} className="text-destructive" /> : <LogOut size={20} className="text-primary" />}
          </div>
          <div className="text-base font-bold">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onClose} className="spring-tap rounded-2xl py-3 text-sm font-semibold bg-muted">Cancel</button>
          <button onClick={onConfirm} className={`spring-tap rounded-2xl py-3 text-sm font-semibold text-white ${danger ? "bg-destructive" : ""}`} style={!danger ? { background: "var(--gradient-primary)" } : undefined}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function PasswordModal({ onClose, onSave, lang }: { onClose: () => void; onSave: (pwd: string) => Promise<boolean>; lang: string }) {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (pwd !== confirm) { toast.error(lang === "ar" ? "كلمتا المرور غير متطابقتين" : "Passwords don't match"); return; }
    setSaving(true);
    const ok = await onSave(pwd);
    setSaving(false);
    if (ok) onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-fade-up" onClick={onClose}>
      <div className="w-full sm:max-w-sm bg-background rounded-t-3xl sm:rounded-3xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="text-base font-bold">{lang === "ar" ? "تغيير كلمة المرور" : "Change password"}</div>
          <button onClick={onClose} className="spring-tap w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X size={14} /></button>
        </div>
        <div className="space-y-3">
          <div className="relative">
            <input type={show ? "text" : "password"} placeholder={lang === "ar" ? "كلمة المرور الجديدة" : "New password"} value={pwd} onChange={(e) => setPwd(e.target.value)} className="settings-input pr-10" />
            <button onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{show ? <EyeOff size={14} /> : <Eye size={14} />}</button>
          </div>
          <input type={show ? "text" : "password"} placeholder={lang === "ar" ? "تأكيد كلمة المرور" : "Confirm password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="settings-input" />
          <div className="text-[11px] text-muted-foreground">{lang === "ar" ? "8 أحرف على الأقل" : "At least 8 characters"}</div>
        </div>
        <button disabled={saving} onClick={submit} className="spring-tap w-full rounded-2xl py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: "var(--gradient-primary)" }}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {lang === "ar" ? "تحديث" : "Update password"}
        </button>
      </div>
    </div>
  );
}
