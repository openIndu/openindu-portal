import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "@/store/auth";
import { AuthGuard } from "@/app/components/AuthGuard";
import { authApi } from "@/api";

// Mock localStorage
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

// Mock @/api
vi.mock("@/api", () => ({
  authApi: {
    refresh: vi.fn(),
    me: vi.fn(),
  },
  clearAuthStorage: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => (
      <div data-testid="navigate" data-to={to}>{`Navigate to ${to}`}</div>
    ),
    Outlet: () => <div data-testid="outlet">Protected Content</div>,
    useLocation: () => ({ pathname: "/protected" }),
  };
});

beforeEach(() => {
  storage.clear();
  vi.clearAllMocks();
  // The provider now validates the persisted session via /auth/me on mount.
  // Resolve it to whatever user the test placed in storage so the synchronously
  // rendered auth state stays put instead of being cleared by a failed check.
  vi.mocked(authApi.me).mockImplementation(() =>
    Promise.resolve(JSON.parse(storage.get("openindu_portal_user") || "null")),
  );
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  );
}

describe("AuthGuard", () => {
  it("should redirect to login when not authenticated", () => {
    render(
      <Wrapper>
        <AuthGuard />
      </Wrapper>,
    );

    expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/login");
  });

  it("should show permission denied when authenticated but insufficient role", () => {
    // Set authenticated state
    storage.set("openindu_portal_token", "test-token");
    storage.set(
      "openindu_portal_user",
      JSON.stringify({ id: 1, phone: "13800000000", role: "user" }),
    );

    render(
      <Wrapper>
        <AuthGuard role="admin" />
      </Wrapper>,
    );

    expect(screen.getByText("权限不足")).toBeInTheDocument();
    expect(
      screen.getByText("该页面仅面向成员及以上角色开放，请联系管理员升级账号权限。"),
    ).toBeInTheDocument();
  });

  it("should show outlet when authenticated and has sufficient role", () => {
    storage.set("openindu_portal_token", "test-token");
    storage.set(
      "openindu_portal_user",
      JSON.stringify({ id: 1, phone: "13800000000", role: "admin" }),
    );

    render(
      <Wrapper>
        <AuthGuard role="admin" />
      </Wrapper>,
    );

    expect(screen.getByTestId("outlet")).toHaveTextContent("Protected Content");
  });

  it("should show outlet when authenticated and no role required", () => {
    storage.set("openindu_portal_token", "test-token");
    storage.set(
      "openindu_portal_user",
      JSON.stringify({ id: 1, phone: "13800000000", role: "user" }),
    );

    render(
      <Wrapper>
        <AuthGuard />
      </Wrapper>,
    );

    expect(screen.getByTestId("outlet")).toHaveTextContent("Protected Content");
  });
});
