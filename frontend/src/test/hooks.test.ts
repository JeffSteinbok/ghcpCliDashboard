/**
 * Hook tests — use renderHook from @testing-library/react.
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { STORAGE_KEY_MODE, STORAGE_KEY_PALETTE } from "../constants";

// ── Stub localStorage ────────────────────────────────────────────────────────

const store: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
});

// ── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  mockFetch.mockReset();
});

// ── useTheme ─────────────────────────────────────────────────────────────────

import { useTheme } from "../hooks/useTheme";

describe("useTheme", () => {
  it("defaults to dark mode and default palette", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme.mode).toBe("dark");
    expect(result.current.theme.palette).toBe("default");
  });

  it("reads initial mode from localStorage", () => {
    store[STORAGE_KEY_MODE] = "light";
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme.mode).toBe("light");
  });

  it("reads initial palette from localStorage", () => {
    store[STORAGE_KEY_PALETTE] = "ocean";
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme.palette).toBe("ocean");
  });

  it("toggleMode switches from dark to light", () => {
    const { result } = renderHook(() => useTheme());
    act(() => { result.current.toggleMode(); });
    expect(result.current.theme.mode).toBe("light");
    expect(store[STORAGE_KEY_MODE]).toBe("light");
  });

  it("toggleMode switches from light to dark", () => {
    store[STORAGE_KEY_MODE] = "light";
    const { result } = renderHook(() => useTheme());
    act(() => { result.current.toggleMode(); });
    expect(result.current.theme.mode).toBe("dark");
    expect(store[STORAGE_KEY_MODE]).toBe("dark");
  });

  it("setPalette updates palette and localStorage", () => {
    const { result } = renderHook(() => useTheme());
    act(() => { result.current.setPalette("neon"); });
    expect(result.current.theme.palette).toBe("neon");
    expect(store[STORAGE_KEY_PALETTE]).toBe("neon");
  });

  it("applies mode to document element", () => {
    renderHook(() => useTheme());
    expect(document.documentElement.getAttribute("data-mode")).toBe("dark");
  });

  it("applies palette to document element", () => {
    renderHook(() => useTheme());
    expect(document.documentElement.getAttribute("data-palette")).toBe("default");
  });

  it("updates document attribute on toggleMode", () => {
    const { result } = renderHook(() => useTheme());
    act(() => { result.current.toggleMode(); });
    expect(document.documentElement.getAttribute("data-mode")).toBe("light");
  });
});

// ── useDisconnect ────────────────────────────────────────────────────────────

import { useDisconnect } from "../hooks/useDisconnect";
import { AppProvider } from "../state";
import type { ReactNode } from "react";
import { createElement } from "react";

function wrapper({ children }: { children: ReactNode }) {
  return createElement(AppProvider, null, children);
}

describe("useDisconnect", () => {
  it("initially reports connected", () => {
    const { result } = renderHook(() => useDisconnect(), { wrapper });
    expect(result.current.disconnected).toBe(false);
  });

  it("retrySeconds is 0 initially", () => {
    const { result } = renderHook(() => useDisconnect(), { wrapper });
    expect(result.current.retrySeconds).toBe(0);
  });
});

// ── useVersion ───────────────────────────────────────────────────────────────

import { useVersion } from "../hooks/useVersion";

describe("useVersion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with initial version and no update available", () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ current: "1.0.0", latest: null, update_available: false }),
    });
    const { result } = renderHook(() => useVersion("1.0.0"));
    expect(result.current.versionInfo.current).toBe("1.0.0");
    expect(result.current.versionInfo.update_available).toBe(false);
    expect(result.current.updating).toBe(false);
  });

  it("fetches version info on mount", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ current: "1.0.0", latest: "2.0.0", update_available: true }),
    });
    const { result } = renderHook(() => useVersion("1.0.0"));

    // Flush microtasks (the fetch promise) without advancing interval timers
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/version");
    expect(result.current.versionInfo.update_available).toBe(true);
    expect(result.current.versionInfo.latest).toBe("2.0.0");
  });

  it("handles fetch error gracefully", async () => {
    mockFetch.mockRejectedValue(new Error("network error"));
    const { result } = renderHook(() => useVersion("1.0.0"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Should keep initial state on error
    expect(result.current.versionInfo.current).toBe("1.0.0");
    expect(result.current.versionInfo.update_available).toBe(false);
  });
});
