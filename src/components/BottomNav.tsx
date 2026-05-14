import { Link, useLocation } from "@tanstack/react-router";
import { Home, CalendarCheck, Wallet, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const tabs = [
  { to: "/", icon: Home, key: "home" as const },
  { to: "/bookings", icon: CalendarCheck, key: "bookings" as const },
  { to: "/wallet", icon: Wallet, key: "wallet" as const },
  { to: "/profile", icon: User, key: "profile" as const },
];

export function BottomNav() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 px-3 pb-3 pt-2 pointer-events-none">
      <div className="glass-strong pointer-events-auto rounded-3xl flex items-center justify-around px-2 py-2 max-w-md mx-auto">
        {tabs.map(({ to, icon: Icon, key }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className="spring-tap flex-1 flex flex-col items-center gap-0.5 py-2 rounded-2xl"
              style={{
                color: active ? "var(--color-primary)" : "var(--color-muted-foreground)",
                background: active ? "color-mix(in oklab, var(--color-primary) 10%, transparent)" : "transparent",
              }}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 2} />
              <span className="text-[10px] font-medium tracking-tight">{t(key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
