import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, ArrowDown } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  threshold?: number;
}

// Touch-driven pull-to-refresh. Activates only when scrolled to the top of
// the document. Falls back gracefully on desktop / non-touch devices.
export function PullToRefresh({ onRefresh, children, threshold = 70 }: PullToRefreshProps) {
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) { startY.current = null; return; }
      startY.current = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (startY.current == null || refreshing) return;
      const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
      if (dy <= 0) { setPull(0); return; }
      // Resistance curve so it feels rubbery
      setPull(Math.min(dy * 0.5, threshold * 1.4));
    };
    const onTouchEnd = async () => {
      if (startY.current == null) return;
      startY.current = null;
      if (pull >= threshold && !refreshing) {
        setRefreshing(true);
        haptic("medium");
        try { await onRefresh(); } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pull, refreshing, threshold, onRefresh]);

  const offset = refreshing ? threshold * 0.6 : pull;
  const rotation = Math.min((pull / threshold) * 180, 180);

  return (
    <div className="relative" style={{ transform: `translateY(${offset}px)`, transition: refreshing || pull === 0 ? "transform 250ms ease" : "none" }}>
      {(pull > 0 || refreshing) && (
        <div
          className="absolute -top-12 left-0 right-0 flex items-center justify-center text-muted-foreground"
          style={{ opacity: Math.min(pull / threshold, 1) }}
        >
          {refreshing
            ? <Loader2 size={18} className="animate-spin text-primary" />
            : <ArrowDown size={18} style={{ transform: `rotate(${rotation}deg)`, transition: "transform 80ms" }} />}
        </div>
      )}
      {children}
    </div>
  );
}
