/**
 * Persistence layer.
 *
 * The original artifact used `window.storage` — a Claude-artifact-only API that
 * silently does nothing in a normal browser. This mirrors that get/set/delete
 * shape on top of `localStorage` so the call sites stay tiny and swappable for a
 * real backend later (single source of truth for "where state lives").
 */

const available: boolean = (() => {
  try {
    const probe = "__roster_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    // Private-mode / disabled storage / SSR — degrade to in-memory (no persistence).
    return false;
  }
})();

/** True when a working persistent store is present. */
export const hasStore = available;

export const storage = {
  get(key: string): { value: string } | null {
    if (!available) return null;
    const value = window.localStorage.getItem(key);
    return value == null ? null : { value };
  },
  set(key: string, value: string): void {
    if (!available) return;
    window.localStorage.setItem(key, value);
  },
  delete(key: string): void {
    if (!available) return;
    window.localStorage.removeItem(key);
  },
};
