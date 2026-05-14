const KEY = "khidmati_split_groups";

export interface SplitMember { code: string; name: string; }
export interface SplitGroup { id: string; name: string; members: SplitMember[]; }

export function getGroups(): SplitGroup[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}

export function saveGroups(groups: SplitGroup[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(groups));
  window.dispatchEvent(new CustomEvent("khidmati:groups"));
}

export function upsertGroup(group: SplitGroup) {
  const all = getGroups();
  const i = all.findIndex((g) => g.id === group.id);
  if (i >= 0) all[i] = group; else all.unshift(group);
  saveGroups(all);
}

export function deleteGroup(id: string) {
  saveGroups(getGroups().filter((g) => g.id !== id));
}
