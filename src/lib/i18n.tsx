import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Lang = "en" | "ar";
type Dict = Record<string, { en: string; ar: string }>;

const dict: Dict = {
  // nav
  home: { en: "Home", ar: "الرئيسية" },
  bookings: { en: "Bookings", ar: "الحجوزات" },
  wallet: { en: "Wallet", ar: "المحفظة" },
  profile: { en: "Profile", ar: "حسابي" },
  // home
  hello: { en: "Hello", ar: "مرحباً" },
  westAmman: { en: "West Amman", ar: "عمّان الغربية" },
  searchPlaceholder: { en: "Search services, providers…", ar: "ابحث عن خدمة أو مزود…" },
  sos: { en: "SOS Emergency", ar: "طوارئ SOS" },
  sosSub: { en: "Tap for instant dispatch", ar: "اضغط للإرسال الفوري" },
  nearYou: { en: "Near you", ar: "بالقرب منك" },
  seeAll: { en: "See all", ar: "عرض الكل" },
  conciergeTitle: { en: "AI Concierge", ar: "المساعد الذكي" },
  conciergePh: { en: "What can I do with 50 JDs tonight?", ar: "ماذا أفعل بـ ٥٠ دينار الليلة؟" },
  goldTitle: { en: "Khidmati Gold", ar: "خدمتي جولد" },
  goldSub: { en: "Priority booking · faster SOS · exclusive deals", ar: "حجز أولوية · طوارئ أسرع · عروض حصرية" },
  upgrade: { en: "Upgrade", ar: "ترقية" },
  // categories
  catHome: { en: "Home Services", ar: "خدمات منزلية" },
  catSports: { en: "Sports", ar: "رياضة" },
  catMedical: { en: "Medical", ar: "طبية" },
  catBeauty: { en: "Beauty", ar: "تجميل" },
  // bookings
  active: { en: "Active", ar: "نشطة" },
  completed: { en: "Completed", ar: "مكتملة" },
  paymentLocked: { en: "Payment locked in escrow", ar: "الدفعة محفوظة في الضمان" },
  paymentUnlocked: { en: "Payment released", ar: "تم تحرير الدفعة" },
  groupSplit: { en: "Group Split", ar: "تقسيم جماعي" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  track: { en: "Track", ar: "تتبع" },
  confirmed: { en: "Confirmed", ar: "مؤكد" },
  pending: { en: "Pending", ar: "قيد الانتظار" },
  // wallet
  balance: { en: "Wallet balance", ar: "رصيد المحفظة" },
  privateCode: { en: "Private code", ar: "الرمز الخاص" },
  topUp: { en: "Top up", ar: "شحن" },
  transfer: { en: "Transfer", ar: "تحويل" },
  split: { en: "Split", ar: "تقسيم" },
  roundUp: { en: "Round-up savings", ar: "مدخرات التقريب" },
  transferToMain: { en: "Transfer to main", ar: "تحويل للرئيسية" },
  recent: { en: "Recent activity", ar: "آخر العمليات" },
  pendingReq: { en: "Pending requests", ar: "الطلبات المعلقة" },
  accept: { en: "Accept", ar: "قبول" },
  decline: { en: "Decline", ar: "رفض" },
  withdraw: { en: "Withdraw", ar: "سحب" },
  awaiting: { en: "Awaiting acceptance", ar: "بانتظار القبول" },
  splitGroups: { en: "Split groups", ar: "مجموعات التقسيم" },
  newGroup: { en: "New group", ar: "مجموعة جديدة" },
  groupName: { en: "Group name", ar: "اسم المجموعة" },
  addCode: { en: "Add code", ar: "أضف رمز" },
  save: { en: "Save", ar: "حفظ" },
  members: { en: "members", ar: "أعضاء" },
  // profile
  settings: { en: "Settings", ar: "الإعدادات" },
  language: { en: "Language", ar: "اللغة" },
  logout: { en: "Log out", ar: "تسجيل الخروج" },
  favourites: { en: "Favourites", ar: "المفضلة" },
  myReviews: { en: "My reviews", ar: "تقييماتي" },
  helpSupport: { en: "Help & support", ar: "الدعم والمساعدة" },
  aboutUs: { en: "About us", ar: "عن خدمتي" },
  goldMember: { en: "Gold member", ar: "عضو جولد" },
  referFriend: { en: "Refer a friend", ar: "ادعُ صديق" },
  // welcome
  welcomeTagline: { en: "On-demand services across West Amman", ar: "خدمات عند الطلب في عمّان الغربية" },
  continueGuest: { en: "Continue as guest", ar: "متابعة كضيف" },
  login: { en: "Log in", ar: "تسجيل الدخول" },
  signup: { en: "Sign up", ar: "إنشاء حساب" },
  areYouBusiness: { en: "Are you a business?", ar: "هل أنت شركة؟" },
  clickHere: { en: "Click here", ar: "اضغط هنا" },
};

interface I18nCtx {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  t: (k: keyof typeof dict) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = dir;
    }
  }, [lang, dir]);

  const t = (k: keyof typeof dict) => dict[k][lang];
  return <Ctx.Provider value={{ lang, dir, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n outside provider");
  return c;
}
