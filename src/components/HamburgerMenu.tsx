import { useState, type ReactNode } from "react";
import { Menu, X, Heart, Star, LifeBuoy, Info, Gift, LogOut } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

interface Item { icon: ReactNode; key: "favourites" | "myReviews" | "referFriend" | "helpSupport" | "aboutUs"; onClick?: () => void; }

export function HamburgerMenu() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const items: Item[] = [
    { icon: <Heart size={20} />, key: "favourites", onClick: () => toast("Favourites — coming soon") },
    { icon: <Star size={20} />, key: "myReviews", onClick: () => toast("My reviews — coming soon") },
    {
      icon: <Gift size={20} />,
      key: "referFriend",
      onClick: () => {
        if (typeof navigator !== "undefined" && navigator.share) {
          navigator.share({ title: "Khidmati", text: "Join me on Khidmati and get 5 JOD credit", url: window.location.origin }).catch(() => {});
        } else {
          toast.success("Referral link copied");
        }
      },
    },
    { icon: <LifeBuoy size={20} />, key: "helpSupport", onClick: () => toast("Support chat opening…") },
    { icon: <Info size={20} />, key: "aboutUs", onClick: () => toast("Khidmati v1.0 · West Amman") },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glass spring-tap rounded-2xl p-2.5"
        aria-label="Menu"
      >
        <Menu size={20} />
      </button>
      {open && (
        <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-up" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-y-0 end-0 w-[82%] max-w-sm glass-strong p-5 animate-fade-up flex flex-col"
            style={{ borderStartStartRadius: "1.75rem", borderEndStartRadius: "1.75rem" }}
          >
            {/* logo header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  خ
                </div>
                <div>
                  <div className="text-base font-bold tracking-tight leading-none">Khidmati</div>
                  <div className="text-sm text-primary font-semibold mt-1">خدمتي</div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="spring-tap p-2 rounded-full hover:bg-muted"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="my-4 h-px bg-border" />

            <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
              {items.map((it) => (
                <button
                  key={it.key}
                  onClick={() => { it.onClick?.(); setOpen(false); }}
                  className="spring-tap flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-primary-tint text-start"
                >
                  <span className="text-primary">{it.icon}</span>
                  <span className="font-medium text-sm">{t(it.key)}</span>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-border">
              <Link
                to="/welcome"
                onClick={() => setOpen(false)}
                className="spring-tap flex items-center gap-3 px-3 py-3 rounded-2xl text-destructive"
              >
                <LogOut size={20} />
                <span className="font-medium text-sm">{t("logout")}</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
