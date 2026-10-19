import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios, { AxiosError } from "axios";
import type { AxiosResponse } from "axios";

// Mock axios first
vi.mock("axios", () => {
  const mockPost = vi.fn();
  const mockGet = vi.fn();
  const mockPatch = vi.fn();
  const mockCreate = vi.fn(() => ({
    post: mockPost,
    get: mockGet,
    patch: mockPatch,
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }));
  return {
    default: {
      create: mockCreate,
      isAxiosError: vi.fn(),
    },
    AxiosError: class AxiosError extends Error {
      response?: unknown;
      constructor(
        message: string,
        _code?: string,
        _config?: unknown,
        _request?: unknown,
        response?: unknown,
      ) {
        super(message);
        this.response = response;
      }
    },
  };
});

// Mock environment variables
vi.stubEnv("VITE_API_BASE", "/api/v1");

// Mock localStorage
const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    removeItem: vi.fn((key: string) => storage.delete(key)),
  },
  writable: true,
});

// Mock window.location
Object.defineProperty(window, "location", {
  value: {
    pathname: "/",
    search: "",
    assign: vi.fn(),
  },
  writable: true,
});

// Now import the API module
import * as apiModule from "@/api";

const {
  getApiErrorMessage,
  isTooManyRequests,
  isPublicApiRequest,
  shouldRedirectToLogin,
  authApi,
  documentsApi,
  softwareApi,
  portalApi,
  visitsApi,
  apiClient,
  unwrap,
  normalizeAuthResponse,
  unwrapPortalContent,
  unwrapPortalList,
} = apiModule as unknown as {
  getApiErrorMessage: typeof apiModule.getApiErrorMessage;
  isTooManyRequests: typeof apiModule.isTooManyRequests;
  isPublicApiRequest: typeof apiModule.isPublicApiRequest;
  shouldRedirectToLogin: typeof apiModule.shouldRedirectToLogin;
  authApi: typeof apiModule.authApi;
  documentsApi: typeof apiModule.documentsApi;
  softwareApi: typeof apiModule.softwareApi;
  portalApi: typeof apiModule.portalApi;
  visitsApi: typeof apiModule.visitsApi;
  apiClient: typeof apiModule.apiClient;
  unwrap: <T>(response: AxiosResponse<apiModule.ApiEnvelope<T> | T>) => T;
  normalizeAuthResponse: (
    payload: apiModule.AuthResponse | apiModule.NestedAuthResponse,
  ) => apiModule.AuthResponse;
  unwrapPortalContent: <T>(value: T | apiModule.PortalContentRecord<T>) => T;
  unwrapPortalList: <T>(
    value: T[] | { items?: Array<T | apiModule.PortalContentRecord<T>> } | undefined,
  ) => T[];
};

// Get access to the mocked functions
const mockedAxios = axios as unknown as {
  isAxiosError: (error: unknown) => boolean;
};

beforeEach(() => {
  storage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.resetAllMocks();
});

// --- Helper to test internal functions ---

describe("unwrap", () => {
  it("should unwrap data from ApiEnvelope", () => {
    const response = { data: { data: { id: 1, name: "test" } } } as AxiosResponse;
    const result = unwrap(response);
    expect(result).toEqual({ id: 1, name: "test" });
  });

  it("should return data directly if no ApiEnvelope", () => {
    const response = { data: { id: 1, name: "test" } } as AxiosResponse;
    const result = unwrap(response);
    expect(result).toEqual({ id: 1, name: "test" });
  });
});

describe("normalizeAuthResponse", () => {
  it("should normalize nested auth response", () => {
    const nested = {
      user: { id: 1, phone: "13800000000", role: "admin" as const },
      tokens: { access_token: "a", refresh_token: "r" },
    };
    const result = normalizeAuthResponse(nested);
    expect(result).toEqual({
      access_token: "a",
      refresh_token: "r",
      user: { id: 1, phone: "13800000000", role: "admin" },
    });
  });

  it("should return flat auth response as-is", () => {
    const flat = {
      access_token: "a",
      refresh_token: "r",
      user: { id: 1, phone: "13800000000", role: "user" as const },
    };
    const result = normalizeAuthResponse(flat);
    expect(result).toEqual(flat);
  });
});

describe("unwrapPortalContent", () => {
  it("should unwrap content from PortalContentRecord", () => {
    const record = { id: 1, content: { title: "Test" } };
    const result = unwrapPortalContent(record);
    expect(result).toEqual({ title: "Test" });
  });

  it("should return value as-is if not wrapped", () => {
    const value = { title: "Test" };
    const result = unwrapPortalContent(value);
    expect(result).toEqual(value);
  });

  it("should return empty object if content is null/undefined", () => {
    const record = { id: 1, content: null };
    const result = unwrapPortalContent(record);
    expect(result).toEqual({});
  });
});

describe("unwrapPortalList", () => {
  it("should unwrap list from items wrapper", () => {
    const wrapper = {
      items: [
        { id: 1, content: { title: "Item 1" } },
        { id: 2, content: { title: "Item 2" } },
      ],
    };
    const result = unwrapPortalList(wrapper);
    expect(result).toEqual([{ title: "Item 1" }, { title: "Item 2" }]);
  });

  it("should return array as-is", () => {
    const list = [{ title: "Item 1" }, { title: "Item 2" }];
    const result = unwrapPortalList(list);
    expect(result).toEqual(list);
  });

  it("should return empty array for undefined", () => {
    const result = unwrapPortalList(undefined);
    expect(result).toEqual([]);
  });

  it("should return empty array for malformed data", () => {
    // Deliberately outside the declared type: the API can return null for an empty list.
    const malformed = { items: null } as unknown as Parameters<typeof unwrapPortalList>[0];
    const result = unwrapPortalList(malformed);
    expect(result).toEqual([]);
  });
});

describe("getApiErrorMessage", () => {
  it("should return detail from AxiosError response data", () => {
    const error = new AxiosError("Network Error", "ERR", undefined, undefined, {
      status: 400,
      data: { detail: "手机号格式错误" },
    } as AxiosResponse);
    (mockedAxios.isAxiosError as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);

    expect(getApiErrorMessage(error)).toBe("手机号格式错误");
  });

  it("should return message from AxiosError response data", () => {
    const error = new AxiosError("Network Error", "ERR", undefined, undefined, {
      status: 400,
      data: { message: "请求参数错误" },
    } as AxiosResponse);
    (mockedAxios.isAxiosError as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);

    expect(getApiErrorMessage(error)).toBe("请求参数错误");
  });

  it("should return AxiosError message if no detail/message", () => {
    const error = new AxiosError("Timeout", "ECONNABORTED");
    (mockedAxios.isAxiosError as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);

    expect(getApiErrorMessage(error)).toBe("Timeout");
  });

  it("should return Error.message for non-Axios errors", () => {
    (mockedAxios.isAxiosError as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const error = new Error("Something went wrong");
    expect(getApiErrorMessage(error)).toBe("Something went wrong");
  });

  it("should return fallback for unknown errors", () => {
    (mockedAxios.isAxiosError as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    expect(getApiErrorMessage("unknown", "默认错误")).toBe("默认错误");
  });

  it("should return default fallback when not provided", () => {
    (mockedAxios.isAxiosError as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    expect(getApiErrorMessage("unknown")).toBe("请求失败，请稍后重试");
  });
});

describe("public API auth redirect helpers", () => {
  it("treats resource list endpoints as public GET requests", () => {
    expect(isPublicApiRequest("get", "/documents")).toBe(true);
    expect(isPublicApiRequest("get", "/software")).toBe(true);
    expect(isPublicApiRequest("get", "/api/v1/documents")).toBe(true);
  });

  it("does not treat download-link endpoints as public requests", () => {
    expect(isPublicApiRequest("get", "/documents/1/download-link")).toBe(false);
    expect(shouldRedirectToLogin("get", "/documents/1/download-link")).toBe(true);
  });

  it("does not redirect to login for public resource list 401 responses", () => {
    expect(shouldRedirectToLogin("get", "/documents")).toBe(false);
    expect(shouldRedirectToLogin("get", "/software")).toBe(false);
  });

  it("does not redirect to login for auth refresh failures", () => {
    expect(shouldRedirectToLogin("post", "/auth/refresh")).toBe(false);
  });
});

describe("isTooManyRequests", () => {
  it("should return true for 429 status", () => {
    const error = new AxiosError("Too Many", "ERR", undefined, undefined, {
      status: 429,
      data: {},
    } as AxiosResponse);
    (mockedAxios.isAxiosError as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);

    expect(isTooManyRequests(error)).toBe(true);
  });

  it("should return false for non-429 status", () => {
    const error = new AxiosError("Not Found", "ERR", undefined, undefined, {
      status: 404,
      data: {},
    } as AxiosResponse);
    (mockedAxios.isAxiosError as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);

    expect(isTooManyRequests(error)).toBe(false);
  });

  it("should return false for non-Axios errors", () => {
    (mockedAxios.isAxiosError as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    expect(isTooManyRequests(new Error("test"))).toBe(false);
  });

  it("should return false for AxiosError without response", () => {
    const error = new AxiosError("Network Error", "ERR");
    (mockedAxios.isAxiosError as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    expect(isTooManyRequests(error)).toBe(false);
  });
});

// --- API tests ---

describe("visitsApi", () => {
  it("sends both visits when the same page is visited again immediately", async () => {
    const mockPost = vi.spyOn(apiClient, "post").mockResolvedValue({
      data: { code: 200, data: { tracked: true } },
    });

    await visitsApi.track("/");
    await visitsApi.track("/");

    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(mockPost).toHaveBeenNthCalledWith(
      1,
      "/visits/track",
      expect.objectContaining({ path: "/" }),
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      2,
      "/visits/track",
      expect.objectContaining({ path: "/" }),
    );
  });
});

describe("authApi", () => {
  it("should have all expected methods", () => {
    expect(typeof authApi.sendCode).toBe("function");
    expect(typeof authApi.login).toBe("function");
    expect(typeof authApi.register).toBe("function");
    expect(typeof authApi.refresh).toBe("function");
    expect(typeof authApi.me).toBe("function");
    expect(typeof authApi.logout).toBe("function");
  });

  it("sendCode should call post and unwrap result", async () => {
    const mockPost = vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      data: { code: 200, data: { success: true } },
    });

    const result = await authApi.sendCode("13800000000");
    expect(result).toEqual({ success: true });
    expect(mockPost).toHaveBeenCalledWith("/auth/send-code", { phone: "13800000000" });
  });

  it("login should call post and normalize nested response", async () => {
    vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      data: {
        code: 200,
        data: {
          user: { id: 1, phone: "13800000000", role: "admin" },
          tokens: { access_token: "access-token", refresh_token: "refresh-token" },
        },
      },
    });

    const result = await authApi.login("13800000000", "888888");
    expect(result.access_token).toBe("access-token");
    expect(result.refresh_token).toBe("refresh-token");
    expect(result.user?.role).toBe("admin");
  });

  it("login should handle flat response format", async () => {
    vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      data: {
        code: 200,
        data: {
          access_token: "at",
          refresh_token: "rt",
          user: { id: 1, phone: "13800000000", role: "user" },
        },
      },
    });

    const result = await authApi.login("13800000000", "888888");
    expect(result.access_token).toBe("at");
    expect(result.refresh_token).toBe("rt");
  });

  it("register should call post and normalize response", async () => {
    vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      data: {
        code: 200,
        data: {
          access_token: "at",
          refresh_token: "rt",
          user: { id: 2, phone: "13900000000", role: "user" },
        },
      },
    });

    const result = await authApi.register("13900000000", "888888");
    expect(result.access_token).toBe("at");
    expect(result.refresh_token).toBe("rt");
  });

  it("refresh should call post and unwrap result", async () => {
    const mockPost = vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      data: { code: 200, data: { access_token: "new-at", refresh_token: "new-rt" } },
    });

    const result = await authApi.refresh("old-rt");
    expect(result.access_token).toBe("new-at");
    expect(result.refresh_token).toBe("new-rt");
    expect(mockPost).toHaveBeenCalledWith("/auth/refresh", { refresh_token: "old-rt" });
  });

  it("me should call get and unwrap result", async () => {
    const mockGet = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: { code: 200, data: { id: 1, phone: "13800000000", role: "admin" } },
    });

    const result = await authApi.me();
    expect(result).toEqual({ id: 1, phone: "13800000000", role: "admin" });
    expect(mockGet).toHaveBeenCalledWith("/auth/me");
  });

  it("updateMe should call patch and unwrap result", async () => {
    const mockPatch = vi.spyOn(apiClient, "patch").mockResolvedValueOnce({
      data: { code: 200, data: { id: 1, phone: "13800000000", nickname: "Tom", role: "admin" } },
    });

    const result = await authApi.updateMe({ nickname: "Tom" });
    expect(result).toEqual({ id: 1, phone: "13800000000", nickname: "Tom", role: "admin" });
    expect(mockPatch).toHaveBeenCalledWith("/auth/me", { nickname: "Tom" });
  });

  it("logout should call post and unwrap result", async () => {
    const mockPost = vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      data: { code: 200, data: { success: true } },
    });

    const result = await authApi.logout();
    expect(result).toEqual({ success: true });
    expect(mockPost).toHaveBeenCalledWith("/auth/logout");
  });
});

describe("documentsApi", () => {
  it("should have all expected methods", () => {
    expect(typeof documentsApi.list).toBe("function");
    expect(typeof documentsApi.get).toBe("function");
    expect(typeof documentsApi.downloadLink).toBe("function");
    expect(typeof documentsApi.brands).toBe("function");
    expect(typeof documentsApi.categories).toBe("function");
  });

  it("list should call get with params and unwrap result", async () => {
    const mockGet = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: { code: 200, data: { items: [], total: 0, page: 1, page_size: 10 } },
    });

    const result = await documentsApi.list({ page: 1, page_size: 10 });
    expect(result).toEqual({ items: [], total: 0, page: 1, page_size: 10 });
    expect(mockGet).toHaveBeenCalledWith("/documents", { params: { page: 1, page_size: 10 } });
  });

  it("list passes an abort signal through, and adds none when not given one", async () => {
    const response = { data: { code: 200, data: { items: [], total: 0, page: 1, page_size: 10 } } };
    const mockGet = vi
      .spyOn(apiClient, "get")
      .mockResolvedValueOnce(response)
      .mockResolvedValueOnce(response);
    const controller = new AbortController();

    await documentsApi.list({ page: 1 }, { signal: controller.signal });
    expect(mockGet).toHaveBeenLastCalledWith("/documents", {
      params: { page: 1 },
      signal: controller.signal,
    });

    await documentsApi.list({ page: 1 }, {});
    expect(mockGet.mock.lastCall?.[1]).not.toHaveProperty("signal");
  });

  it("get should call get with id and unwrap result", async () => {
    const mockGet = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: { code: 200, data: { id: 1, name: "doc.pdf" } },
    });

    const result = await documentsApi.get(1);
    expect(result).toEqual({ id: 1, name: "doc.pdf" });
    expect(mockGet).toHaveBeenCalledWith("/documents/1");
  });

  it("downloadLink should call get and unwrap result", async () => {
    const mockGet = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: { code: 200, data: { download_url: "http://example.com/file.pdf" } },
    });

    const result = await documentsApi.downloadLink(1);
    expect(result).toEqual({ download_url: "http://example.com/file.pdf" });
    expect(mockGet).toHaveBeenCalledWith("/documents/1/download-link");
  });

  it("brands and categories should call backend option endpoints", async () => {
    const mockGet = vi
      .spyOn(apiClient, "get")
      .mockResolvedValueOnce({ data: { code: 200, data: ["siemens"] } })
      .mockResolvedValueOnce({ data: { code: 200, data: ["plc-manual"] } });

    await expect(documentsApi.brands()).resolves.toEqual(["siemens"]);
    await expect(documentsApi.categories()).resolves.toEqual(["plc-manual"]);
    expect(mockGet).toHaveBeenNthCalledWith(1, "/documents/brands/list");
    expect(mockGet).toHaveBeenNthCalledWith(2, "/documents/categories/list");
  });
});

describe("softwareApi", () => {
  it("should have all expected methods", () => {
    expect(typeof softwareApi.list).toBe("function");
    expect(typeof softwareApi.get).toBe("function");
    expect(typeof softwareApi.downloadLink).toBe("function");
    expect(typeof softwareApi.brands).toBe("function");
    expect(typeof softwareApi.categories).toBe("function");
  });

  it("list should call get with params and unwrap result", async () => {
    const mockGet = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: { code: 200, data: { items: [], total: 0, page: 1, page_size: 10 } },
    });

    const result = await softwareApi.list({ page: 1, page_size: 10 });
    expect(result).toEqual({ items: [], total: 0, page: 1, page_size: 10 });
    expect(mockGet).toHaveBeenCalledWith("/software", { params: { page: 1, page_size: 10 } });
  });

  it("list passes an abort signal through to the request", async () => {
    const mockGet = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: { code: 200, data: { items: [], total: 0, page: 1, page_size: 10 } },
    });
    const controller = new AbortController();

    await softwareApi.list({ page: 1 }, { signal: controller.signal });
    expect(mockGet).toHaveBeenCalledWith("/software", {
      params: { page: 1 },
      signal: controller.signal,
    });
  });

  it("get should call get with id and unwrap result", async () => {
    const mockGet = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: { code: 200, data: { id: 1, name: "software.zip" } },
    });

    const result = await softwareApi.get(1);
    expect(result).toEqual({ id: 1, name: "software.zip" });
    expect(mockGet).toHaveBeenCalledWith("/software/1");
  });

  it("downloadLink should call get and unwrap result", async () => {
    const mockGet = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: { code: 200, data: { url: "http://example.com/software.zip" } },
    });

    const result = await softwareApi.downloadLink(1);
    expect(result).toEqual({ url: "http://example.com/software.zip" });
    expect(mockGet).toHaveBeenCalledWith("/software/1/download-link");
  });

  it("brands and categories should call backend option endpoints", async () => {
    const mockGet = vi
      .spyOn(apiClient, "get")
      .mockResolvedValueOnce({ data: { code: 200, data: ["siemens"] } })
      .mockResolvedValueOnce({ data: { code: 200, data: ["utility"] } });

    await expect(softwareApi.brands()).resolves.toEqual(["siemens"]);
    await expect(softwareApi.categories()).resolves.toEqual(["utility"]);
    expect(mockGet).toHaveBeenNthCalledWith(1, "/software/brands/list");
    expect(mockGet).toHaveBeenNthCalledWith(2, "/software/categories/list");
  });
});

describe("portalApi", () => {
  it("should have all expected methods", () => {
    expect(typeof portalApi.hero).toBe("function");
    expect(typeof portalApi.solutions).toBe("function");
    expect(typeof portalApi.carousel).toBe("function");
  });

  it("hero should call get and unwrap portal content", async () => {
    const mockGet = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: { code: 200, data: { id: 1, content: { title: "Welcome" } } },
    });

    const result = await portalApi.hero();
    expect(result).toEqual({ title: "Welcome" });
    expect(mockGet).toHaveBeenCalledWith("/portal/hero");
  });

  it("hero should handle direct content format", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: { code: 200, data: { title: "Welcome" } },
    });

    const result = await portalApi.hero();
    expect(result).toEqual({ title: "Welcome" });
  });

  it("solutions should call get and unwrap portal list with items wrapper", async () => {
    const mockGet = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: {
        code: 200,
        data: {
          items: [{ id: 1, content: { id: 1, title: "PLC", description: "PLC workflow" } }],
        },
      },
    });

    const result = await portalApi.solutions();
    expect(result).toEqual([{ id: 1, title: "PLC", description: "PLC workflow" }]);
    expect(mockGet).toHaveBeenCalledWith("/portal/solutions");
  });

  it("solutions should handle direct array format", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: {
        code: 200,
        data: [{ id: 1, title: "PLC", description: "PLC workflow" }],
      },
    });

    const result = await portalApi.solutions();
    expect(result).toEqual([{ id: 1, title: "PLC", description: "PLC workflow" }]);
  });

  it("carousel should call get and unwrap portal list", async () => {
    const mockGet = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: {
        code: 200,
        data: {
          items: [{ id: 1, content: { id: 1, title: "Slide 1", image_url: "image.jpg" } }],
        },
      },
    });

    const result = await portalApi.carousel();
    expect(result).toEqual([{ id: 1, title: "Slide 1", image_url: "image.jpg" }]);
    expect(mockGet).toHaveBeenCalledWith("/portal/carousel");
  });

  it("carousel returns empty array for malformed responses", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: { code: 200, data: { items: null } },
    });

    const result = await portalApi.carousel();
    expect(result).toEqual([]);
  });
});

// --- Interceptor tests ---

describe("API client interceptors", () => {
  it("should expose request and response interceptor hooks", () => {
    expect(apiClient.interceptors.request.use).toBeDefined();
    expect(apiClient.interceptors.response.use).toBeDefined();
  });
});
