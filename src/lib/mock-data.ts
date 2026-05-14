export interface Service {
  id: string;
  name: { en: string; ar: string };
  emoji: string;
  rating: number;
  distanceKm: number;
  category: "home" | "sports" | "medical" | "beauty";
  provider: string;
}

export const services: Service[] = [
  { id: "s1", name: { en: "SparkleClean Pro", ar: "سباركل كلين" }, emoji: "🧼", rating: 4.9, distanceKm: 0.6, category: "home", provider: "SparkleClean" },
  { id: "s2", name: { en: "Padel Republic", ar: "بادل ريبابليك" }, emoji: "🎾", rating: 4.8, distanceKm: 1.2, category: "sports", provider: "Padel Republic" },
  { id: "s3", name: { en: "Dr. Hala Dental", ar: "د. هلا للأسنان" }, emoji: "🦷", rating: 5.0, distanceKm: 2.1, category: "medical", provider: "Hala Clinic" },
  { id: "s4", name: { en: "Glow Salon", ar: "صالون جلو" }, emoji: "💇", rating: 4.7, distanceKm: 0.9, category: "beauty", provider: "Glow" },
  { id: "s5", name: { en: "FixIt Plumbing", ar: "فيكس إت سباكة" }, emoji: "🔧", rating: 4.6, distanceKm: 1.8, category: "home", provider: "FixIt" },
  { id: "s6", name: { en: "Hammam Al-Andalus", ar: "حمام الأندلس" }, emoji: "🧖", rating: 4.9, distanceKm: 3.0, category: "beauty", provider: "Andalus" },
];

export interface Booking {
  id: string;
  service: string;
  provider: string;
  emoji: string;
  date: string;
  status: "confirmed" | "pending" | "completed";
  amountJod: number;
  paymentLocked: boolean;
  groupSplit?: { members: number };
}

export const bookings: Booking[] = [
  { id: "b1", service: "Deep Home Cleaning", provider: "SparkleClean Pro", emoji: "🧼", date: "Today · 4:00 PM", status: "confirmed", amountJod: 35, paymentLocked: true },
  { id: "b2", service: "Padel Court · 90 min", provider: "Padel Republic", emoji: "🎾", date: "Tomorrow · 7:30 PM", status: "pending", amountJod: 24, paymentLocked: true, groupSplit: { members: 4 } },
  { id: "b3", service: "Dental Cleaning", provider: "Dr. Hala", emoji: "🦷", date: "May 9 · 11:00 AM", status: "completed", amountJod: 40, paymentLocked: false },
  { id: "b4", service: "Haircut & Beard", provider: "Glow Salon", emoji: "💇", date: "May 6 · 5:30 PM", status: "completed", amountJod: 18, paymentLocked: false },
];

export interface Tx {
  id: string;
  label: string;
  amount: number; // negative = debit
  date: string;
  emoji: string;
}

export const transactions: Tx[] = [
  { id: "t1", label: "Top up · CliQ", amount: 50, date: "Today", emoji: "⬆️" },
  { id: "t2", label: "SparkleClean Pro", amount: -35, date: "Today", emoji: "🧼" },
  { id: "t3", label: "Padel split · Omar", amount: -6, date: "Yesterday", emoji: "🎾" },
  { id: "t4", label: "Round-up saved", amount: 1.25, date: "Yesterday", emoji: "🪙" },
  { id: "t5", label: "Glow Salon", amount: -18, date: "May 6", emoji: "💇" },
];
