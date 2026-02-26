/**
 * Component tests — render components with minimal props and assert DOM output.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session, ProcessInfo, ProcessMap } from "../types";
import { AppProvider } from "../state";

// ── Factories ────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "test-id",
    cwd: null,
    repository: null,
    branch: null,
    summary: "Test session",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T01:00:00Z",
    created_ago: "1 hour ago",
    time_ago: "1 hour ago",
    turn_count: 5,
    file_count: 3,
    checkpoint_count: 1,
    is_running: false,
    state: null,
    waiting_context: "",
    bg_tasks: 0,
    group: "General",
    recent_activity: null,
    restart_cmd: "copilot",
    mcp_servers: [],
    tool_calls: 10,
    subagent_runs: 2,
    intent: "",
    ...overrides,
  };
}

function makeProcess(overrides: Partial<ProcessInfo> = {}): ProcessInfo {
  return {
    pid: 100,
    parent_pid: 0,
    terminal_pid: 0,
    terminal_name: "",
    cmdline: "",
    yolo: false,
    state: "working",
    waiting_context: "",
    bg_tasks: 0,
    mcp_servers: [],
    ...overrides,
  };
}

// Stub localStorage
const store: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
});

// Stub clipboard
vi.stubGlobal("navigator", {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
});

// Mock fetch globally for components that fetch on mount
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ checkpoints: [], refs: [], turns: [], recent_output: [], tool_counts: [], files: [] }),
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderWithProvider(ui: React.ReactElement) {
  return render(<AppProvider>{ui}</AppProvider>);
}

// ── SessionCard ──────────────────────────────────────────────────────────────

import SessionCard from "../components/SessionCard";

describe("SessionCard", () => {
  it("renders session summary and timestamp", () => {
    const s = makeSession({ summary: "Fix auth bug", created_ago: "2 hours ago" });
    renderWithProvider(<SessionCard session={s} processInfo={undefined} />);
    expect(screen.getByText("Fix auth bug")).toBeInTheDocument();
    expect(screen.getByText(/2 hours ago/)).toBeInTheDocument();
  });

  it("shows live-dot when running", () => {
    const s = makeSession();
    const p = makeProcess({ state: "working" });
    const { container } = renderWithProvider(<SessionCard session={s} processInfo={p} />);
    expect(container.querySelector(".live-dot")).not.toBeNull();
  });

  it("shows yolo badge when processInfo has yolo flag", () => {
    const s = makeSession();
    const p = makeProcess({ yolo: true });
    renderWithProvider(<SessionCard session={s} processInfo={p} />);
    expect(screen.getByText(/YOLO/)).toBeInTheDocument();
  });

  it("renders (Untitled session) when summary is null", () => {
    const s = makeSession({ summary: null });
    renderWithProvider(<SessionCard session={s} processInfo={undefined} />);
    expect(screen.getByText("(Untitled session)")).toBeInTheDocument();
  });

  it("shows turn count badge", () => {
    const s = makeSession({ turn_count: 12 });
    renderWithProvider(<SessionCard session={s} processInfo={undefined} />);
    expect(screen.getByText(/12 turns/)).toBeInTheDocument();
  });

  it("shows checkpoint badge when checkpoint_count > 0", () => {
    const s = makeSession({ checkpoint_count: 3 });
    renderWithProvider(<SessionCard session={s} processInfo={undefined} />);
    expect(screen.getByText(/3 checkpoints/)).toBeInTheDocument();
  });

  it("shows cwd when present", () => {
    const s = makeSession({ cwd: "/home/user/project" });
    renderWithProvider(<SessionCard session={s} processInfo={undefined} />);
    expect(screen.getByText(/\/home\/user\/project/)).toBeInTheDocument();
  });

  it("shows branch badge when branch is set", () => {
    const s = makeSession({ branch: "main", repository: "org/repo" });
    renderWithProvider(<SessionCard session={s} processInfo={undefined} />);
    expect(screen.getByText(/org\/repo\/main/)).toBeInTheDocument();
  });
});

// ── SessionTile ──────────────────────────────────────────────────────────────

import SessionTile from "../components/SessionTile";

describe("SessionTile", () => {
  const onOpenDetail = vi.fn();

  beforeEach(() => onOpenDetail.mockClear());

  it("renders session summary", () => {
    const s = makeSession({ summary: "Deploy service" });
    renderWithProvider(
      <SessionTile session={s} processInfo={undefined} onOpenDetail={onOpenDetail} />,
    );
    expect(screen.getByText("Deploy service")).toBeInTheDocument();
  });

  it("shows live-dot when running", () => {
    const s = makeSession();
    const p = makeProcess({ state: "working" });
    const { container } = renderWithProvider(
      <SessionTile session={s} processInfo={p} onOpenDetail={onOpenDetail} />,
    );
    expect(container.querySelector(".live-dot")).not.toBeNull();
  });

  it("shows (Untitled session) when summary is null", () => {
    const s = makeSession({ summary: null });
    renderWithProvider(
      <SessionTile session={s} processInfo={undefined} onOpenDetail={onOpenDetail} />,
    );
    expect(screen.getByText("(Untitled session)")).toBeInTheDocument();
  });

  it("shows yolo badge when processInfo has yolo flag", () => {
    const s = makeSession();
    const p = makeProcess({ yolo: true });
    renderWithProvider(
      <SessionTile session={s} processInfo={p} onOpenDetail={onOpenDetail} />,
    );
    expect(screen.getByText("🔥")).toBeInTheDocument();
  });

  it("shows turn count", () => {
    const s = makeSession({ turn_count: 7 });
    renderWithProvider(
      <SessionTile session={s} processInfo={undefined} onOpenDetail={onOpenDetail} />,
    );
    expect(screen.getByText(/7/)).toBeInTheDocument();
  });

  it("shows PID and kill button when running with pid", () => {
    const s = makeSession();
    const p = makeProcess({ pid: 42 });
    renderWithProvider(
      <SessionTile session={s} processInfo={p} onOpenDetail={onOpenDetail} />,
    );
    expect(screen.getByText(/PID 42/)).toBeInTheDocument();
    expect(screen.getByText("✕")).toBeInTheDocument();
  });
});

// ── SessionList ──────────────────────────────────────────────────────────────

import SessionList from "../components/SessionList";

describe("SessionList", () => {
  it("renders empty message for active when no sessions", () => {
    renderWithProvider(
      <SessionList sessions={[]} processes={{}} isActive={true} panelId="active" />,
    );
    expect(screen.getByText("No active sessions detected.")).toBeInTheDocument();
  });

  it("renders empty message for previous when no sessions", () => {
    renderWithProvider(
      <SessionList sessions={[]} processes={{}} isActive={false} panelId="previous" />,
    );
    expect(screen.getByText("No previous sessions.")).toBeInTheDocument();
  });

  it("renders grouped sessions", () => {
    const sessions = [
      makeSession({ id: "1", summary: "Session one", group: "ProjectA" }),
      makeSession({ id: "2", summary: "Session two", group: "ProjectA" }),
    ];
    renderWithProvider(
      <SessionList sessions={sessions} processes={{}} isActive={true} panelId="active" />,
    );
    expect(screen.getByText("ProjectA")).toBeInTheDocument();
    expect(screen.getByText("Session one")).toBeInTheDocument();
    expect(screen.getByText("Session two")).toBeInTheDocument();
  });

  it("shows group count", () => {
    const sessions = [
      makeSession({ id: "1", group: "MyGroup" }),
      makeSession({ id: "2", group: "MyGroup" }),
      makeSession({ id: "3", group: "MyGroup" }),
    ];
    renderWithProvider(
      <SessionList sessions={sessions} processes={{}} isActive={true} panelId="active" />,
    );
    expect(screen.getByText("(3)")).toBeInTheDocument();
  });
});

// ── StatsRow ─────────────────────────────────────────────────────────────────

import StatsRow from "../components/StatsRow";

describe("StatsRow", () => {
  it("returns null when no active sessions", () => {
    const { container } = render(<StatsRow active={[]} processes={{}} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders running count", () => {
    const active = [makeSession({ id: "a" }), makeSession({ id: "b" })];
    render(<StatsRow active={active} processes={{}} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Running Now")).toBeInTheDocument();
  });

  it("sums turn counts across sessions", () => {
    const active = [
      makeSession({ id: "a", turn_count: 10 }),
      makeSession({ id: "b", turn_count: 20 }),
    ];
    render(<StatsRow active={active} processes={{}} />);
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("sums tool calls across sessions", () => {
    const active = [
      makeSession({ id: "a", tool_calls: 5 }),
      makeSession({ id: "b", tool_calls: 15 }),
    ];
    render(<StatsRow active={active} processes={{}} />);
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("sums subagent runs across sessions", () => {
    const active = [
      makeSession({ id: "a", subagent_runs: 3, turn_count: 0, tool_calls: 0 }),
      makeSession({ id: "b", subagent_runs: 7, turn_count: 0, tool_calls: 0 }),
    ];
    render(<StatsRow active={active} processes={{}} />);
    expect(screen.getByText("Sub-agents")).toBeInTheDocument();
    expect(screen.getAllByText("10")).toHaveLength(1);
  });

  it("sums background tasks from processes", () => {
    const active = [makeSession({ id: "a" }), makeSession({ id: "b" })];
    const processes: ProcessMap = {
      a: makeProcess({ bg_tasks: 2 }),
      b: makeProcess({ bg_tasks: 3 }),
    };
    render(<StatsRow active={active} processes={processes} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Background Tasks")).toBeInTheDocument();
  });
});

// ── TabBar ───────────────────────────────────────────────────────────────────

import TabBar from "../components/TabBar";

describe("TabBar", () => {
  it("renders all four tabs", () => {
    renderWithProvider(<TabBar activeCount={3} previousCount={5} />);
    expect(screen.getByText(/Active/)).toBeInTheDocument();
    expect(screen.getByText(/Previous/)).toBeInTheDocument();
    expect(screen.getByText(/Timeline/)).toBeInTheDocument();
    expect(screen.getByText(/Files/)).toBeInTheDocument();
  });

  it("shows active count badge", () => {
    renderWithProvider(<TabBar activeCount={7} previousCount={0} />);
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("shows previous count badge", () => {
    renderWithProvider(<TabBar activeCount={0} previousCount={12} />);
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("highlights active tab by default", () => {
    renderWithProvider(<TabBar activeCount={0} previousCount={0} />);
    const activeTab = screen.getByText(/Active/).closest(".tab");
    expect(activeTab?.classList.contains("active")).toBe(true);
  });

  it("renders tile and list view buttons", () => {
    renderWithProvider(<TabBar activeCount={0} previousCount={0} />);
    expect(screen.getByTitle("Tile view")).toBeInTheDocument();
    expect(screen.getByTitle("List view")).toBeInTheDocument();
  });

  it("renders notification button", () => {
    renderWithProvider(<TabBar activeCount={0} previousCount={0} />);
    expect(screen.getByText(/Notifications/)).toBeInTheDocument();
  });
});

// ── Tooltip ──────────────────────────────────────────────────────────────────

import Tooltip from "../components/Tooltip";

describe("Tooltip", () => {
  it("renders a hidden tooltip element", () => {
    render(<Tooltip />);
    const el = document.getElementById("dash-tooltip");
    expect(el).not.toBeNull();
    expect(el!.style.display).toBe("none");
  });

  it("tooltip element has fixed positioning", () => {
    render(<Tooltip />);
    const el = document.getElementById("dash-tooltip");
    expect(el!.style.position).toBe("fixed");
  });

  it("tooltip element has pointer-events none", () => {
    render(<Tooltip />);
    const el = document.getElementById("dash-tooltip");
    expect(el!.style.pointerEvents).toBe("none");
  });
});
