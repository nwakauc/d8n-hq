const STORAGE_KEY = "hq:nav-expanded:v1";

function readExpanded(): Record<string, boolean> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeExpanded(value: Record<string, boolean>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // sessionStorage may be unavailable
  }
}

export function isNavGroupExpanded(groupId: string, defaultExpanded = false): boolean {
  const stored = readExpanded()[groupId];
  return stored ?? defaultExpanded;
}

export function setNavGroupExpanded(groupId: string, expanded: boolean): void {
  const next = { ...readExpanded(), [groupId]: expanded };
  writeExpanded(next);
}

export function clearNavExpansionState(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
