import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthState = vi.hoisted(() => ({
  currentUser: null as null | {
    uid: string;
    getIdToken: ReturnType<typeof vi.fn>;
  },
  authStateReady: vi.fn(async () => {}),
}));

vi.mock("./firebase/config", () => ({
  auth: mockAuthState,
  db: {},
  app: {},
  rtdb: {},
}));

import { clearAdminSession, clearStudentSession, isStudentAuthenticated } from "./authService";
import { api } from "./apiClient";
import { STORAGE_KEYS } from "../utils/storage";

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

describe("auth session stability & anti-auto-logout guards", () => {
  const originalLocalStorage = globalThis.localStorage;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createMemoryStorage(),
      configurable: true,
      writable: true,
    });
    mockAuthState.currentUser = null;
    mockAuthState.authStateReady.mockClear();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: originalLocalStorage,
      configurable: true,
      writable: true,
    });
    globalThis.fetch = originalFetch;
  });

  it("clearAdminSession preserves active student auth_role and student_info", () => {
    localStorage.setItem("auth_role", "student");
    localStorage.setItem(STORAGE_KEYS.AUTH_ROLE, "student");
    localStorage.setItem("student_info", JSON.stringify({ username: "hocsinh01", displayName: "An" }));
    localStorage.setItem("admin_token", "stale_admin_token");

    clearAdminSession();

    expect(localStorage.getItem("admin_token")).toBeNull();
    expect(localStorage.getItem("auth_role")).toBe("student");
    expect(isStudentAuthenticated()).toBe(true);
  });

  it("clearAdminSession clears auth_role when current role is admin", () => {
    localStorage.setItem("auth_role", "admin");
    localStorage.setItem(STORAGE_KEYS.AUTH_ROLE, "admin");
    localStorage.setItem("admin_token", "dk_admin_123");

    clearAdminSession();

    expect(localStorage.getItem("auth_role")).toBeNull();
    expect(localStorage.getItem("admin_token")).toBeNull();
  });

  it("clearStudentSession does not wipe an active admin auth_role", () => {
    localStorage.setItem("auth_role", "admin");
    localStorage.setItem("student_info", JSON.stringify({ username: "old" }));

    clearStudentSession();

    expect(localStorage.getItem("student_info")).toBeNull();
    expect(localStorage.getItem("auth_role")).toBe("admin");
  });

  it("apiClient retries once with force-refreshed Firebase ID token after HTTP 401", async () => {
    const getIdToken = vi.fn(async (forceRefresh?: boolean) =>
      forceRefresh ? "fresh-token-v2" : "expired-token-v1"
    );
    mockAuthState.currentUser = { uid: "u_retry_1", getIdToken };

    const authHeadersSeen: string[] = [];
    globalThis.fetch = vi.fn(async (_url: any, init?: any) => {
      const authHeader = String((init?.headers as Record<string, string>)?.Authorization || "");
      authHeadersSeen.push(authHeader);
      if (authHeader === "Bearer expired-token-v1") {
        return {
          ok: false,
          status: 401,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ error: "invalid_token", message: "Expired" }),
        } as any;
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: "ok" }),
      } as any;
    }) as any;

    const res = await api.get<{ success: boolean; data: string }>("/api/wallet/me");
    expect(res).toEqual({ success: true, data: "ok" });
    expect(getIdToken).toHaveBeenNthCalledWith(1, false);
    expect(getIdToken).toHaveBeenNthCalledWith(2, true);
    expect(authHeadersSeen).toEqual(["Bearer expired-token-v1", "Bearer fresh-token-v2"]);
  });
});
