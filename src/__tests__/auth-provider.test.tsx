import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api", () => ({
  authApi: {
    refresh: vi.fn(),
    me: vi.fn(),
    updateMe: vi.fn(),
    logout: vi.fn(),
  },
  clearAuthStorage: vi.fn(),
}));

import { authApi } from "@/api";
import { AuthProvider, useAuth } from "@/store/auth";

const authApiMock = authApi as unknown as {
  refresh: ReturnType<typeof vi.fn>;
  me: ReturnType<typeof vi.fn>;
  updateMe: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
};

const storage = new Map<string, string>();

Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    removeItem: vi.fn((key: string) => storage.delete(key)),
    clear: vi.fn(() => storage.clear()),
  },
  writable: true,
});

function Consumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.isLoading)}</span>
      <span data-testid="authed">{String(auth.isAuthenticated)}</span>
      <span data-testid="admin">{String(auth.isAdmin)}</span>
      <span data-testid="member">{String(auth.isMember)}</span>
      <span data-testid="phone">{auth.user?.phone ?? "none"}</span>
      <span data-testid="has-member">{String(auth.hasRole("member"))}</span>
      <span data-testid="has-any">{String(auth.hasRole())}</span>
      <button type="button" onClick={() => void auth.login({ access_token: "login-token", refresh_token: "login-refresh", user: { id: 1, phone: "13800000000", role: "admin" } })}>login-user</button>
      <button type="button" onClick={() => void auth.login({ access_token: "login-token", refresh_token: "login-refresh" })}>login-me</button>
      <button type="button" onClick={() => void auth.refreshToken()}>refresh</button>
      <button type="button" onClick={() => auth.setUser({ id: 2, phone: "13900000000", role: "member" })}>set-user</button>
      <button type="button" onClick={() => void auth.updateProfile({ nickname: "Tom" })}>update-profile</button>
      <button type="button" onClick={() => auth.setUser(null)}>clear-user</button>
      <button type="button" onClick={() => void auth.logout()}>logout</button>
    </div>
  );
}

function ThrowingConsumer() {
  useAuth();
  return null;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  it("throws when useAuth is used outside provider", () => {
    expect(() => render(<ThrowingConsumer />)).toThrow("useAuth must be used within AuthProvider");
  });

  it("starts logged out without a refresh token", async () => {
    render(<AuthProvider><Consumer /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("authed").textContent).toBe("false");
    expect(screen.getByTestId("phone").textContent).toBe("none");
    expect(screen.getByTestId("has-any").textContent).toBe("false");
  });

  it("restores an existing session on mount via /auth/me", async () => {
    storage.set("openindu_portal_token", "existing-token");
    storage.set("openindu_portal_refresh_token", "old-refresh");
    authApiMock.me.mockResolvedValue({ id: 1, phone: "13800000000", role: "member" });

    render(<AuthProvider><Consumer /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(authApiMock.me).toHaveBeenCalled();
    expect(screen.getByTestId("authed").textContent).toBe("true");
    expect(screen.getByTestId("member").textContent).toBe("true");
    expect(screen.getByTestId("has-member").textContent).toBe("true");
  });

  it("clears the session when /auth/me fails on mount", async () => {
    storage.set("openindu_portal_token", "stale-token");
    storage.set("openindu_portal_refresh_token", "bad-refresh");
    authApiMock.me.mockRejectedValue(new Error("unauthorized"));

    render(<AuthProvider><Consumer /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("authed").textContent).toBe("false");
  });

  it("logs in with provided user and persists auth", async () => {
    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));

    await act(async () => screen.getByText("login-user").click());

    expect(storage.get("openindu_portal_token")).toBe("login-token");
    expect(screen.getByTestId("admin").textContent).toBe("true");
    expect(screen.getByTestId("phone").textContent).toBe("13800000000");
  });

  it("loads current user after login when response omits user", async () => {
    authApiMock.me.mockResolvedValue({ id: 3, phone: "13700000000", role: "user" });
    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));

    await act(async () => screen.getByText("login-me").click());

    expect(authApiMock.me).toHaveBeenCalled();
    expect(screen.getByTestId("phone").textContent).toBe("13700000000");
    expect(screen.getByTestId("has-member").textContent).toBe("false");
  });

  it("supports setting, clearing, refreshing, and logging out", async () => {
    storage.set("openindu_portal_token", "initial");
    storage.set("openindu_portal_refresh_token", "refresh-token");
    authApiMock.me.mockResolvedValue({ id: 1, phone: "13800000000", role: "user" });
    authApiMock.refresh.mockResolvedValue({ access_token: "refreshed", refresh_token: "refresh-token", user: { id: 1, phone: "13800000000", role: "admin" } });
    authApiMock.logout.mockResolvedValue({ success: true });

    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));

    await act(async () => screen.getByText("set-user").click());
    expect(screen.getByTestId("phone").textContent).toBe("13900000000");

    authApiMock.updateMe.mockResolvedValue({ id: 2, phone: "13900000000", role: "member", nickname: "Tom" });
    await act(async () => screen.getByText("update-profile").click());
    expect(authApiMock.updateMe).toHaveBeenCalledWith({ nickname: "Tom" });

    await act(async () => screen.getByText("clear-user").click());
    expect(screen.getByTestId("phone").textContent).toBe("none");

    await act(async () => screen.getByText("refresh").click());
    expect(storage.get("openindu_portal_token")).toBe("refreshed");

    await act(async () => screen.getByText("logout").click());
    expect(authApiMock.logout).toHaveBeenCalled();
    expect(storage.get("openindu_portal_token")).toBeUndefined();
  });
});
