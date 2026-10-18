import { describe, expect, it, vi } from "vitest";
import { installPreloadErrorRecovery, RELOAD_COOLDOWN_MS } from "@/lib/preloadRecovery";

function setup(options: { storage?: Record<string, string>; storageThrows?: boolean } = {}) {
  let handler: ((event: Event) => void) | undefined;
  const reload = vi.fn();
  const target = {
    addEventListener: vi.fn((type: string, listener: (event: Event) => void) => {
      if (type === "vite:preloadError") handler = listener;
    }),
    location: { reload } as unknown as Location,
  };
  const store = options.storage ?? {};
  const storage = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
  };
  let clock = 1_000_000;
  installPreloadErrorRecovery(
    target,
    () => {
      if (options.storageThrows) throw new Error("SecurityError");
      return storage;
    },
    () => clock,
  );

  const fire = () => {
    const event = new Event("vite:preloadError", { cancelable: true });
    handler!(event);
    return event;
  };
  return { fire, reload, target, advance: (ms: number) => (clock += ms), store };
}

describe("installPreloadErrorRecovery", () => {
  it("listens for vite:preloadError and does nothing until it fires", () => {
    const { reload, target } = setup();
    expect(target.addEventListener).toHaveBeenCalledWith("vite:preloadError", expect.any(Function));
    expect(reload).not.toHaveBeenCalled();
  });

  it("reloads once and suppresses the error that would otherwise surface", () => {
    const { fire, reload } = setup();
    const event = fire();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not reload again while inside the cooldown, and leaves the error to surface", () => {
    const { fire, reload, advance } = setup();
    fire();
    advance(RELOAD_COOLDOWN_MS - 1);
    const event = fire();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(false);
  });

  it("reloads again once the cooldown has passed", () => {
    const { fire, reload, advance } = setup();
    fire();
    advance(RELOAD_COOLDOWN_MS);
    fire();
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("does not reload when storage is unavailable (it could not tell a loop from a first try)", () => {
    const { fire, reload } = setup({ storageThrows: true });
    const event = fire();
    expect(reload).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("treats a garbage stored timestamp as 'never reloaded'", () => {
    const { fire, reload } = setup({ storage: { openindu_preload_reload_at: "not-a-number" } });
    fire();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
