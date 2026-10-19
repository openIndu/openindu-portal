const RELOAD_KEY = "openindu_preload_reload_at";
export const RELOAD_COOLDOWN_MS = 10_000;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

/**
 * A deploy replaces the hashed chunk files, so a tab opened before it can 404
 * on its next lazy import. Vite reports that as `vite:preloadError`; one reload
 * fetches the new index.html and its chunks. The cooldown (kept in
 * sessionStorage) stops that from becoming a reload loop when a chunk is
 * genuinely missing, in which case the error is left to surface.
 */
export function installPreloadErrorRecovery(
  target: Pick<Window, "addEventListener" | "location"> = window,
  getStorage: () => StorageLike = () => window.sessionStorage,
  now: () => number = Date.now,
): void {
  target.addEventListener("vite:preloadError", (event) => {
    try {
      const storage = getStorage();
      const last = Number(storage.getItem(RELOAD_KEY) ?? 0);
      if (now() - last < RELOAD_COOLDOWN_MS) return;
      storage.setItem(RELOAD_KEY, String(now()));
    } catch {
      // Without storage we cannot tell whether we already reloaded: do not risk a loop.
      return;
    }
    event.preventDefault();
    target.location.reload();
  });
}
