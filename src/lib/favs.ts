const KEY = "khidmati_favs";

export function getFavs(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}

export function setFavs(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent("khidmati:favs"));
}

export function toggleFav(id: string): string[] {
  const cur = getFavs();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  setFavs(next);
  return next;
}
