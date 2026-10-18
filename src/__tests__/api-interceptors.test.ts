import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import {
  apiClient,
  STORAGE_KEYS,
  tagsApi,
  unwrapPortalList,
  isPublicApiRequest,
  shouldRedirectToLogin,
} from "@/api";

function failingAdapter(status: number) {
  return vi.fn(async (config: InternalAxiosRequestConfig) => {
    throw new AxiosError(`HTTP ${status}`, "ERR_BAD_RESPONSE", config, undefined, {
      data: {},
      status,
      statusText: "Error",
      headers: {},
      config,
    });
  });
}

describe("API authentication interceptors", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/login");
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete (navigator as unknown as { locks?: unknown }).locks;
  });

  it("attaches the client ID and current access token to requests", async () => {
    localStorage.setItem(STORAGE_KEYS.token, "old-access");
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => ({
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }));
    await apiClient.get("/auth/me", { adapter });
    expect(adapter).toHaveBeenCalledOnce();
    const headers = adapter.mock.calls[0][0].headers as AxiosHeaders;
    expect(headers.get("Authorization")).toBe("Bearer old-access");
    expect(headers.get("X-OpenIndu-Client-Id")).toBeTruthy();
  });

  it("leaves non-authentication failures intact", async () => {
    await expect(apiClient.get("/auth/me", { adapter: failingAdapter(500) })).rejects.toMatchObject(
      { response: { status: 500 } },
    );
  });

  it("clears stored credentials when refresh endpoint returns 401", async () => {
    localStorage.setItem(STORAGE_KEYS.token, "access");
    localStorage.setItem(STORAGE_KEYS.refreshToken, "refresh");
    await expect(
      apiClient.post("/auth/refresh", {}, { adapter: failingAdapter(401) }),
    ).rejects.toMatchObject({ response: { status: 401 } });
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.refreshToken)).toBeNull();
  });

  it("clears credentials without a refresh token on private 401 responses", async () => {
    localStorage.setItem(STORAGE_KEYS.token, "expired");
    await expect(apiClient.get("/auth/me", { adapter: failingAdapter(401) })).rejects.toMatchObject(
      { response: { status: 401 } },
    );
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull();
  });

  it("keeps a public list 401 from trying to refresh without a refresh token", async () => {
    await expect(
      apiClient.get("/documents", { adapter: failingAdapter(401) }),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });

  it("does not start another refresh after a retried request returns 401", async () => {
    localStorage.setItem(STORAGE_KEYS.token, "expired");
    const config = {
      url: "/auth/me",
      method: "get",
      headers: new AxiosHeaders(),
      _retry: true,
    } as InternalAxiosRequestConfig & { _retry: boolean };
    const adapter = failingAdapter(401);
    await expect(apiClient.request({ ...config, adapter })).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(adapter).toHaveBeenCalledOnce();
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull();
  });

  it("reuses a token another tab refreshed while the Web Lock was pending", async () => {
    localStorage.setItem(STORAGE_KEYS.token, "expired");
    localStorage.setItem(STORAGE_KEYS.refreshToken, "refresh-token");
    const locks = {
      request: vi.fn(async (_name: string, callback: () => Promise<string>) => {
        localStorage.setItem(STORAGE_KEYS.token, "fresh-from-other-tab");
        return callback();
      }),
    };
    Object.defineProperty(navigator, "locks", { configurable: true, value: locks });
    const adapter = vi
      .fn()
      .mockImplementationOnce(failingAdapter(401))
      .mockImplementationOnce(async (config: InternalAxiosRequestConfig) => ({
        data: { ok: true },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      }));
    const result = await apiClient.get("/auth/me", { adapter });
    expect(result.data).toEqual({ ok: true });
    expect(locks.request).toHaveBeenCalledOnce();
    expect(adapter).toHaveBeenCalledTimes(2);
    expect((adapter.mock.calls[1][0].headers as AxiosHeaders).get("Authorization")).toBe(
      "Bearer fresh-from-other-tab",
    );
  });

  it("passes explicit tag filters to the backend", async () => {
    const get = vi.spyOn(apiClient, "get").mockResolvedValue({ data: { data: [] } });
    await tagsApi.list("brand", "", "Siemens");
    await tagsApi.list();
    expect(get).toHaveBeenNthCalledWith(1, "/tags", {
      params: { type: "brand", parent: "", brand: "Siemens" },
    });
    expect(get).toHaveBeenNthCalledWith(2, "/tags", { params: {} });
  });

  it("classifies public GET paths, but requires authentication for mutations", () => {
    for (const path of [
      "/tags",
      "/documents/brands/list",
      "/documents/categories/list",
      "/software/brands/list",
      "/software/categories/list",
    ]) {
      expect(isPublicApiRequest(undefined, path)).toBe(true);
      expect(shouldRedirectToLogin("GET", path)).toBe(false);
      expect(isPublicApiRequest("post", path)).toBe(false);
    }
    expect(isPublicApiRequest("get", "/auth/me")).toBe(false);
    expect(shouldRedirectToLogin("post", "/auth/login")).toBe(false);
    expect(unwrapPortalList({ items: "invalid" } as never)).toEqual([]);
  });
});
