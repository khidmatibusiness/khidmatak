import { useState, type ReactNode } from "react";
import { Menu, X, Heart, Star, LifeBuoy, Info } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Item { icon: ReactNode; key: "favourites" | "myReviews" | "helpSupport" | "aboutUs"; }

const items: Item[] = [
  { icon: <Heart size={20} />, key: "favourites" },
  { icon: <Star size={20} />, key: "myReviews" },
  { icon: <LifeBuoy size={20} />, key: "helpSupport" },
  { icon: <Info size={20} />, key: "aboutUs" },
];

export function HamburgerMenu() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
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
        <div className="fixed inset-0 z-[60] flex" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-up" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative glass-strong w-72 m-3 rounded-3xl p-5 animate-fade-up flex flex-col gap-1"
          >
            <button
              onClick={() => setOpen(false)}
              className="self-end spring-tap p-2 rounded-full hover:bg-muted"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <div className="px-2 pb-3">
              <div className="text-xs text-muted-foreground">Khidmati</div>
              <div className="text-lg font-semibold">خدمتي</div>
            </div>
            {items.map((it) => (
              <button
                key={it.key}
                className="spring-tap flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-primary-tint text-start"
              >
                <span className="text-primary">{it.icon}</span>
                <span className="font-medium">{t(it.key)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
