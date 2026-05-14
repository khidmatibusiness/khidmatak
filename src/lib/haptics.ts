// Lightweight haptic feedback. Uses the Vibration API where available and
// silently no-ops elsewhere. Patterns roughly match iOS UIImpactFeedback levels.
export type HapticStyle = "light" | "medium" | "heavy" | "success" | "warning" | "error";

const PATTERNS: Record<HapticStyle, number | number[]> = {
  light: 8,
  medium: 14,
  heavy: 22,
  success: [10, 30, 10],
  warning: [12, 40, 12],
  error: [20, 40, 20, 40, 20],
};

export function haptic(style: HapticStyle = "light") {
  if (typeof navigator === "undefined") return;
  const v = (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }).vibrate;
  if (typeof v !== "function") return;
  try { v.call(navigator, PATTERNS[style] as number & number[]); } catch { /* noop */ }
}
