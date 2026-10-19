import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { getClientId } from "@/lib/clientIdentity";
import { loginPath } from "@/i18n/locale";

export type UserRole = "user" | "member" | "admin";

export interface User {
  id: number | string;
  phone: string;
  role: UserRole;
  nickname?: string;
  is_active?: boolean;
  is_blacklisted?: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type?: string;
}

export interface AuthResponse extends AuthTokens {
  user?: User;
  is_new_user?: boolean;
}

export interface NestedAuthResponse {
  user?: User;
  is_new_user?: boolean;
  tokens?: AuthTokens & {
    expires_in?: number;
    access_jti?: string;
    refresh_jti?: string;
    access_expires_at?: string;
    refresh_expires_at?: string;
  };
}

export interface ApiEnvelope<T> {
  code?: number;
  data?: T;
  message?: string;
  detail?: string;
}

export interface PaginationParams {
  page?: number;
  size?: number;
  page_size?: number;
  keyword?: string;
  brand?: string;
  category?: string;
  series?: string;
  published_only?: boolean;
  expand_versions?: boolean;
  sort_by?: string;
  sort_order?: string;
}

export type SoftwarePaginationParams = Omit<PaginationParams, "series">;

export interface RequestOptions {
  /** Cancels the HTTP request, e.g. when a newer search supersedes it. */
  signal?: AbortSignal;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size?: number;
  page_size: number;
  pages?: number;
}

export interface ResourceItem {
  id: number | string;
  title?: string;
  name?: string;
  filename?: string;
  original_name?: string;
  brand?: string;
  category?: string;
  series?: string;
  description?: string;
  file_size?: number;
  download_count?: number;
  version?: string;
  latest_version?: string;
  latest_version_size?: number;
  versions_count?: number;
  // present when the list is fetched with expand_versions=true
  version_id?: number;
  version_upload_time?: string;
  version_download_count?: number;
  is_latest_version?: boolean;
  created_at?: string;
  upload_time?: string;
}

export interface DownloadLinkResponse {
  download_url?: string;
  url?: string;
  expires_in?: number;
  filename?: string;
}

export interface PreviewLinkResponse {
  preview_url?: string;
  url?: string;
  expires_in?: number;
  filename?: string;
}

export type OptionValue = string;

export interface ResourceTag {
  id: number;
  type: string;
  value: string;
  label_zh: string;
  parent_value?: string;
  brand_value?: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
}


export const STORAGE_KEYS = {
  token: "openindu_portal_token",
  refreshToken: "openindu_portal_refresh_token",
  user: "openindu_portal_user",
} as const;

function normalizeApiPath(url?: string) {
  if (!url) return "";
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.pathname.replace(/^\/api\/v\d+/, "");
  } catch {
    return url.split("?")[0].replace(/^\/api\/v\d+/, "");
  }
}

export function isPublicApiRequest(method?: string, url?: string) {
  if ((method ?? "get").toLowerCase() !== "get") return false;
  const path = normalizeApiPath(url);
  return (
    path === "/documents" ||
    path === "/software" ||
    path === "/tags" ||
    path === "/documents/brands/list" ||
    path === "/documents/categories/list" ||
    path === "/software/brands/list" ||
    path === "/software/categories/list"
  );
}

// Auth endpoints that don't require authentication (public)
const PUBLIC_AUTH_ENDPOINTS = [
  "/auth/send-code",
  "/auth/login",
  "/auth/register",
  "/auth/sign-in",
  "/auth/refresh",
];

export function shouldRedirectToLogin(method?: string, url?: string) {
  const path = normalizeApiPath(url);
  // Only exclude public auth endpoints, NOT all /auth/* paths
  if (PUBLIC_AUTH_ENDPOINTS.includes(path)) return false;
  return !isPublicApiRequest(method, url);
}

export function unwrap<T>(response: AxiosResponse<ApiEnvelope<T> | T>): T {
  const body = response.data;
  if (body && typeof body === "object" && "data" in body) {
    return (body as ApiEnvelope<T>).data as T;
  }
  return body as T;
}

export function normalizeAuthResponse(payload: AuthResponse | NestedAuthResponse): AuthResponse {
  if ("tokens" in payload && payload.tokens) {
    return {
      ...payload.tokens,
      user: payload.user,
      is_new_user: payload.is_new_user,
    };
  }
  return payload as AuthResponse;
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "/api/v1",
  timeout: 15_000,
});

// Token refresh state
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

export function clearAuthStorage() {
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.user);
}

// --- Cross-tab refresh coordination ------------------------------------
// The backend ROTATES refresh tokens: every /auth/refresh blacklists the
// presented token's jti and returns a fresh pair. Two concurrent refreshes
// with the same token therefore make the second one 401. `isRefreshing` above
// single-flights within a tab; the Web Locks API serializes across tabs of the
// same browser. A bare axios instance is used for the refresh call so a 401
// from the refresh endpoint itself does not recurse through this interceptor.
const rawRefreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "/api/v1",
  timeout: 15_000,
});

async function rawRefresh(refreshToken: string): Promise<AuthResponse> {
  const response = await rawRefreshClient.post<ApiEnvelope<AuthResponse | NestedAuthResponse>>("/auth/refresh", {
    refresh_token: refreshToken,
  });
  return normalizeAuthResponse(unwrap(response));
}

function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const nav = navigator as Navigator & {
    locks?: { request?: (name: string, cb: () => Promise<T>) => Promise<T> };
  };
  if (typeof navigator !== "undefined" && nav.locks?.request) {
    return nav.locks.request("openindu-portal-token-refresh", fn);
  }
  return fn();
}

// Refresh inside the cross-tab lock. `staleAccess` is the access token that just
// 401'd; if storage already holds a different one, another tab refreshed while
// we waited for the lock, so reuse it instead of rotating the token again.
function performRefresh(staleAccess: string | null): Promise<string> {
  return withRefreshLock(async () => {
    const current = localStorage.getItem(STORAGE_KEYS.token);
    if (current && current !== staleAccess) return current;
    const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
    if (!refreshToken) throw new Error("missing_refresh_token");
    const result = await rawRefresh(refreshToken);
    if (!result.access_token) throw new Error("refresh_failed");
    localStorage.setItem(STORAGE_KEYS.token, result.access_token);
    if (result.refresh_token) localStorage.setItem(STORAGE_KEYS.refreshToken, result.refresh_token);
    if (result.user) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(result.user));
    return result.access_token;
  });
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.token);
  const setHeader = (key: string, value: string) => {
    if (typeof config.headers.set === "function") config.headers.set(key, value);
    else (config.headers as Record<string, string>)[key] = value;
  };
  setHeader("X-OpenIndu-Client-Id", getClientId());
  if (token) setHeader("Authorization", `Bearer ${token}`);
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const requestPath = normalizeApiPath(originalRequest.url);

    // Special case: /auth/refresh itself returning 401 means refresh token is invalid
    // Skip refresh logic, clear storage and redirect immediately
    if (error.response?.status === 401 && requestPath === "/auth/refresh") {
      clearAuthStorage();
      isRefreshing = false;
      const target = loginPath();
      if (window.location.pathname !== target) {
        window.location.assign(`${target}?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      }
      return Promise.reject(error);
    }

    // Normal 401 handling: try to refresh token first
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);

      if (!refreshToken) {
        clearAuthStorage();
        isRefreshing = false;
        const target = loginPath();
        if (window.location.pathname !== target && shouldRedirectToLogin(originalRequest.method, originalRequest.url)) {
          window.location.assign(`${target}?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        }
        return Promise.reject(error);
      }

      const failedAccessToken = localStorage.getItem(STORAGE_KEYS.token);
      try {
        const newToken = await performRefresh(failedAccessToken);

        processQueue(null, newToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        clearAuthStorage();
        processQueue(refreshError, null);
        // Force redirect to login on refresh token failure - token is definitely invalid
        const target = loginPath();
        if (window.location.pathname !== target) {
          window.location.assign(`${target}?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // For other 401 errors (not during token refresh), clear storage and redirect
    if (error.response?.status === 401) {
      clearAuthStorage();
      const target = loginPath();
      if (window.location.pathname !== target && shouldRedirectToLogin(originalRequest.method, originalRequest.url)) {
        window.location.assign(`${target}?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      }
    }

    return Promise.reject(error);
  },
);

export const authApi = {
  async sendCode(phone: string) {
    return unwrap(await apiClient.post<ApiEnvelope<{ success: boolean }>>("/auth/send-code", { phone }));
  },
  async login(phone: string, code: string) {
    return normalizeAuthResponse(unwrap(await apiClient.post<ApiEnvelope<AuthResponse | NestedAuthResponse>>("/auth/login", { phone, code })));
  },
  async register(phone: string, code: string) {
    return normalizeAuthResponse(unwrap(await apiClient.post<ApiEnvelope<AuthResponse | NestedAuthResponse>>("/auth/register", { phone, code })));
  },
  async signIn(phone: string, code: string) {
    return normalizeAuthResponse(unwrap(await apiClient.post<ApiEnvelope<AuthResponse | NestedAuthResponse>>("/auth/sign-in", { phone, code })));
  },
  async refresh(refreshToken: string) {
    return normalizeAuthResponse(unwrap(await apiClient.post<ApiEnvelope<AuthResponse | NestedAuthResponse>>("/auth/refresh", { refresh_token: refreshToken })));
  },
  async me() {
    return unwrap(await apiClient.get<ApiEnvelope<User>>("/auth/me"));
  },
  async updateMe(payload: { nickname?: string | null }) {
    return unwrap(await apiClient.patch<ApiEnvelope<User>>("/auth/me", payload));
  },
  async logout() {
    return unwrap(await apiClient.post<ApiEnvelope<{ success: boolean }>>("/auth/logout"));
  },
  async deleteAccount() {
    return unwrap(await apiClient.delete<ApiEnvelope<{ success: boolean }>>("/auth/me"));
  },
  async changePhone(newPhone: string, code: string) {
    return unwrap(await apiClient.post<ApiEnvelope<{ user: User }>>("/auth/change-phone", { new_phone: newPhone, code }));
  },
};

export const tagsApi = {
  async list(type?: string, parent?: string, brand?: string) {
    return unwrap(await apiClient.get<ApiEnvelope<ResourceTag[]>>("/tags", { params: { ...(type && { type }), ...(parent !== undefined && { parent }), ...(brand !== undefined && { brand }) } }));
  },
};

export const documentsApi = {
  async list(params: PaginationParams, options?: RequestOptions) {
    return unwrap(
      await apiClient.get<ApiEnvelope<PaginatedResponse<ResourceItem>>>("/documents", {
        params,
        ...(options?.signal && { signal: options.signal }),
      }),
    );
  },
  async get(id: number | string) {
    return unwrap(await apiClient.get<ApiEnvelope<ResourceItem>>(`/documents/${id}`));
  },
  async downloadLink(id: number | string) {
    return unwrap(await apiClient.get<ApiEnvelope<DownloadLinkResponse>>(`/documents/${id}/download-link`));
  },
  async previewLink(id: number | string) {
    return unwrap(await apiClient.get<ApiEnvelope<PreviewLinkResponse>>(`/documents/${id}/preview-link`));
  },
  async brands() {
    return unwrap(await apiClient.get<ApiEnvelope<OptionValue[]>>("/documents/brands/list"));
  },
  async categories() {
    return unwrap(await apiClient.get<ApiEnvelope<OptionValue[]>>("/documents/categories/list"));
  },
};

export const softwareApi = {
  async list(params: SoftwarePaginationParams, options?: RequestOptions) {
    return unwrap(
      await apiClient.get<ApiEnvelope<PaginatedResponse<ResourceItem>>>("/software", {
        params,
        ...(options?.signal && { signal: options.signal }),
      }),
    );
  },
  async get(id: number | string) {
    return unwrap(await apiClient.get<ApiEnvelope<ResourceItem>>(`/software/${id}`));
  },
  async downloadLink(id: number | string) {
    return unwrap(await apiClient.get<ApiEnvelope<DownloadLinkResponse>>(`/software/${id}/download-link`));
  },
  async downloadVersionLink(id: number | string, versionId: number | string) {
    return unwrap(await apiClient.get<ApiEnvelope<DownloadLinkResponse>>(`/software/${id}/versions/${versionId}/download-link`));
  },
  async brands() {
    return unwrap(await apiClient.get<ApiEnvelope<OptionValue[]>>("/software/brands/list"));
  },
  async categories() {
    return unwrap(await apiClient.get<ApiEnvelope<OptionValue[]>>("/software/categories/list"));
  },
};

export const visitsApi = {
  async track(path = window.location.pathname) {
    return unwrap(await apiClient.post<ApiEnvelope<{ tracked: boolean }>>("/visits/track", {
      path,
      client_id: getClientId(),
      event_type: "page_view",
    }));
  },
};

export interface PortalContentRecord<T = Record<string, unknown>> {
  id: number;
  content?: T | null;
}

export function unwrapPortalContent<T>(value: T | PortalContentRecord<T>): T {
  if (value !== null && typeof value === "object" && "content" in value) {
    const record = value as PortalContentRecord<T>;
    return (record.content ?? {}) as T;
  }
  return value as T;
}

export function unwrapPortalList<T>(
  value: T[] | { items?: Array<T | PortalContentRecord<T>> | null } | undefined,
): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if ("items" in value) {
    const items = (value as { items?: unknown[] | null }).items;
    if (!items || !Array.isArray(items)) return [];
    return items.map((item) => unwrapPortalContent(item as T | PortalContentRecord<T>)) as T[];
  }
  return [];
}

export const portalApi = {
  async hero() {
    const raw = unwrap(await apiClient.get<ApiEnvelope<unknown>>("/portal/hero"));
    return unwrapPortalContent(raw);
  },
  async solutions() {
    const raw = unwrap(await apiClient.get<ApiEnvelope<unknown>>("/portal/solutions"));
    return unwrapPortalList(raw as unknown[] | { items?: Array<unknown> | null });
  },
  async carousel() {
    const raw = unwrap(await apiClient.get<ApiEnvelope<unknown>>("/portal/carousel"));
    return unwrapPortalList(raw as unknown[] | { items?: Array<unknown> | null });
  },
};

// --- 智能咨询 / RAG 对话（SSE 流式，§4.3.12）---------------------------------
// axios 不适合读取流式响应，改用 fetch + ReadableStream 手动解析 SSE 帧。

export interface ChatSource {
  document_name: string;
  page: number;
  brand?: string;
  category?: string;
  score?: number;
}

export interface ChatQuota {
  limit: number;
  used: number;
  remaining: number | null;
  unlimited: boolean;
}

export interface ChatStreamBody {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  filters?: { brand?: string; category?: string };
}

export interface ChatStreamHandlers {
  onSources?: (sources: ChatSource[]) => void;
  onMode?: (mode: ChatMode) => void;
  onDelta?: (text: string) => void;
  onDone?: (payload: unknown) => void;
  onError?: (detail: string) => void;
  signal?: AbortSignal;
  filters?: { brand?: string; category?: string };
}

export type ChatMode = "grounded" | "fallback";

interface ParsedSseEvent {
  event: string;
  data: string;
}

// 解析 SSE 帧缓冲：返回完整事件列表 + 残留（不完整）尾串。纯函数，便于单测。
export function parseSseFrames(buffer: string): { events: ParsedSseEvent[]; rest: string } {
  const normalized = buffer.replace(/\r\n/g, "\n");
  const parts = normalized.split("\n\n");
  const rest = parts.pop() ?? "";
  const events: ParsedSseEvent[] = [];
  for (const block of parts) {
    if (!block.trim()) continue;
    let event = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
    }
    events.push({ event, data: dataLines.join("\n") });
  }
  return { events, rest };
}

// --- 多会话管理 -----------------------------------------------------------

export interface ChatSession {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export const chatSessionApi = {
  async list(): Promise<ChatSession[]> {
    return unwrap(await apiClient.get<ApiEnvelope<ChatSession[]>>("/chat/sessions"));
  },
  async create(): Promise<ChatSession> {
    return unwrap(await apiClient.post<ApiEnvelope<ChatSession>>("/chat/sessions"));
  },
  async rename(id: number, title: string): Promise<ChatSession> {
    return unwrap(await apiClient.patch<ApiEnvelope<ChatSession>>(`/chat/sessions/${id}`, { title }));
  },
  async remove(id: number): Promise<void> {
    await apiClient.delete(`/chat/sessions/${id}`);
  },
  async messages(id: number) {
    return unwrap(
      await apiClient.get<ApiEnvelope<Array<{ id: number; role: string; content: string; sources?: ChatSource[] | null; mode?: ChatMode | null; feedback?: number | null }>>>(
        `/chat/sessions/${id}/messages`
      )
    );
  },
  async feedback(sessionId: number, messageId: number, value: 1 | -1): Promise<void> {
    await apiClient.post(`/chat/sessions/${sessionId}/messages/${messageId}/feedback`, { value });
  },
};

export const chatApi = {
  async quota(): Promise<ChatQuota> {
    return unwrap(await apiClient.get<ApiEnvelope<ChatQuota>>("/chat/quota"));
  },

  // 发起一次流式问答。通过 handlers 回调 sources/delta/done/error。
  async stream(body: ChatStreamBody, handlers: ChatStreamHandlers = {}): Promise<void> {
    const base = import.meta.env.VITE_API_BASE || "/api/v1";

    async function doFetch(): Promise<Response> {
      const token = localStorage.getItem(STORAGE_KEYS.token);
      return fetch(`${base}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OpenIndu-Client-Id": getClientId(),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: handlers.signal,
      });
    }

    let resp: Response;
    try {
      resp = await doFetch();
    } catch {
      handlers.onError?.("网络错误，请稍后重试");
      return;
    }

    // On 401, try to refresh the access token and retry once.
    // Raw fetch() does NOT go through the axios interceptor that handles
    // automatic token refresh, so we must handle it here explicitly.
    if (resp.status === 401) {
      const refreshTok = localStorage.getItem(STORAGE_KEYS.refreshToken);
      if (refreshTok) {
        try {
          await performRefresh(localStorage.getItem(STORAGE_KEYS.token));
          try {
            resp = await doFetch();
          } catch {
            handlers.onError?.("网络错误，请稍后重试");
            return;
          }
        } catch {
          // Refresh failed; fall through to show the 401 error below
        }
      }
    }

    if (!resp.ok || !resp.body) {
      let detail = `请求失败（${resp.status}）`;
      if (resp.status === 401) detail = "登录态已失效，请重新登录";
      else if (resp.status === 403) detail = "智能咨询面向会员开放";
      else if (resp.status === 429) detail = "今日咨询次数已用完，请明天再来";
      else {
        try {
          const j = (await resp.json()) as { detail?: string; message?: string };
          detail = j?.detail || j?.message || detail;
        } catch {
          /* 非 JSON 错误体，沿用默认文案 */
        }
      }
      handlers.onError?.(detail);
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { events, rest } = parseSseFrames(buffer);
        buffer = rest;
        for (const ev of events) {
          if (ev.event === "delta") {
            try {
              handlers.onDelta?.((JSON.parse(ev.data) as { text?: string }).text ?? "");
            } catch {
              /* ignore malformed delta */
            }
          } else if (ev.event === "sources") {
            try {
              handlers.onSources?.(JSON.parse(ev.data) as ChatSource[]);
            } catch {
              /* ignore */
            }
          } else if (ev.event === "mode") {
            try {
              const m = (JSON.parse(ev.data) as { mode?: ChatMode }).mode;
              if (m === "grounded" || m === "fallback") handlers.onMode?.(m);
            } catch {
              /* ignore */
            }
          } else if (ev.event === "done") {
            try {
              handlers.onDone?.(JSON.parse(ev.data));
            } catch {
              handlers.onDone?.({});
            }
          } else if (ev.event === "error") {
            try {
              handlers.onError?.((JSON.parse(ev.data) as { detail?: string }).detail ?? "生成失败");
            } catch {
              handlers.onError?.("生成失败");
            }
          }
        }
      }
    } catch (e) {
      if ((e as { name?: string })?.name !== "AbortError") {
        handlers.onError?.("连接中断，请重试");
      }
    }
  },

  // 会话模式流式问答（history 由后端从 DB 读取）
  async streamSession(sessionId: number, message: string, handlers: ChatStreamHandlers = {}): Promise<void> {
    const base = import.meta.env.VITE_API_BASE || "/api/v1";

    async function doFetch(): Promise<Response> {
      const token = localStorage.getItem(STORAGE_KEYS.token);
      return fetch(`${base}/chat/sessions/${sessionId}/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OpenIndu-Client-Id": getClientId(),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message, ...(handlers.filters ? { filters: handlers.filters } : {}) }),
        signal: handlers.signal,
      });
    }

    let resp: Response;
    try {
      resp = await doFetch();
    } catch {
      handlers.onError?.("网络错误，请稍后重试");
      return;
    }

    // On 401, try to refresh the access token and retry once.
    // Raw fetch() does NOT go through the axios interceptor that handles
    // automatic token refresh, so we must handle it here explicitly.
    if (resp.status === 401) {
      const refreshTok = localStorage.getItem(STORAGE_KEYS.refreshToken);
      if (refreshTok) {
        try {
          await performRefresh(localStorage.getItem(STORAGE_KEYS.token));
          try {
            resp = await doFetch();
          } catch {
            handlers.onError?.("网络错误，请稍后重试");
            return;
          }
        } catch {
          // Refresh failed; fall through to show the 401 error below
        }
      }
    }

    if (!resp.ok || !resp.body) {
      let detail = `请求失败（${resp.status}）`;
      if (resp.status === 401) detail = "登录态已失效，请重新登录";
      else if (resp.status === 403) detail = "智能咨询面向会员开放";
      else if (resp.status === 429) detail = "今日咨询次数已用完，请明天再来";
      else {
        try {
          const j = (await resp.json()) as { detail?: string; message?: string };
          detail = j?.detail || j?.message || detail;
        } catch { /* ignore */ }
      }
      handlers.onError?.(detail);
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { events, rest } = parseSseFrames(buffer);
        buffer = rest;
        for (const ev of events) {
          if (ev.event === "delta") {
            try { handlers.onDelta?.((JSON.parse(ev.data) as { text?: string }).text ?? ""); } catch { /* ignore */ }
          } else if (ev.event === "sources") {
            try { handlers.onSources?.(JSON.parse(ev.data) as ChatSource[]); } catch { /* ignore */ }
          } else if (ev.event === "mode") {
            try {
              const m = (JSON.parse(ev.data) as { mode?: ChatMode }).mode;
              if (m === "grounded" || m === "fallback") handlers.onMode?.(m);
            } catch { /* ignore */ }
          } else if (ev.event === "done") {
            try { handlers.onDone?.(JSON.parse(ev.data)); } catch { handlers.onDone?.({}); }
          } else if (ev.event === "error") {
            try { handlers.onError?.((JSON.parse(ev.data) as { detail?: string }).detail ?? "生成失败"); } catch { handlers.onError?.("生成失败"); }
          }
        }
      }
    } catch (e) {
      if ((e as { name?: string })?.name !== "AbortError") {
        handlers.onError?.("连接中断，请重试");
      }
    }
  },
};


export interface MemberApplicationStatus {
  id: number;
  status: "pending" | "approved" | "rejected";
  created_at?: string;
}

export const memberApplicationApi = {
  apply: async (note?: string) =>
    unwrap<MemberApplicationStatus>(await apiClient.post("/member-applications", { note: note ?? null })),
  mine: async () =>
    unwrap<MemberApplicationStatus | null>(await apiClient.get("/member-applications/mine")),
};

export function getApiErrorMessage(error: unknown, fallback = "请求失败，请稍后重试") {
  if (axios.isAxiosError<ApiEnvelope<unknown>>(error)) {
    const data = error.response?.data;
    return data?.detail || data?.message || error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export function isTooManyRequests(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 429;
}
