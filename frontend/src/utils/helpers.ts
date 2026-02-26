/**
 * Shared utility functions used across components.
 *
 * These are pure functions with no React dependency — easy to unit test.
 */

import type { Session, ProcessInfo } from "../types";

/**
 * HTML-escape a string to prevent XSS when injecting into innerHTML.
 * Mirrors the `esc()` function in dashboard.js.
 */
export function esc(s: string | null | undefined): string {
  if (!s) return "";
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

/** State display labels — matches the vanilla JS stateIcons map. */
export const STATE_LABELS: Record<string, string> = {
  waiting: "⏳ Waiting",
  working: "⚒️ Working",
  thinking: "🤔 Thinking",
  idle: "🔵 Idle",
  unknown: "",
};

/** CSS class for state badges — matches the vanilla JS stateCls map. */
export const STATE_BADGE_CLASS: Record<string, string> = {
  waiting: "badge-waiting",
  working: "badge-working",
  thinking: "badge-thinking",
  idle: "badge-idle",
  unknown: "badge-active",
};

/** CSS class for tile cards by state. */
export const TILE_STATE_CLASS: Record<string, string> = {
  waiting: "waiting-tile",
  working: "active-tile",
  thinking: "active-tile",
  idle: "idle-tile",
  unknown: "",
};

/** CSS class for list cards by state. */
export function listCardClass(
  isRunning: boolean,
  state: string,
): string {
  if (!isRunning) return "";
  if (state === "waiting") return "waiting-session";
  if (state === "idle") return "idle-session";
  return "active-session";
}

/**
 * Group sessions by their `group` field, sorted by group size descending.
 * Returns [groupName, sessions][] pairs.
 */
export function groupSessions(
  sessions: Session[],
): [string, Session[]][] {
  const groups: Record<string, Session[]> = {};
  for (const s of sessions) {
    const g = s.group || "General";
    (groups[g] ??= []).push(s);
  }
  return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
}

/**
 * Filter sessions matching a search string against summary, repo,
 * branch, cwd, group, intent, and MCP servers.
 */
export function filterSessions(
  sessions: Session[],
  filter: string,
): Session[] {
  if (!filter) return sessions;
  const lower = filter.toLowerCase();
  return sessions.filter((s) => {
    const hay = [
      s.summary,
      s.repository,
      s.branch,
      s.cwd,
      s.group,
      s.intent,
      ...(s.mcp_servers || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(lower);
  });
}

/**
 * Split sessions into active (has running process) and previous
 * (completed within the last 5 days). Matches vanilla JS logic.
 */
export function splitActivePrevious(
  sessions: Session[],
  processes: Record<string, ProcessInfo>,
): { active: Session[]; previous: Session[] } {
  const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
  const active: Session[] = [];
  const previous: Session[] = [];

  for (const s of sessions) {
    if (processes[s.id]) {
      active.push(s);
    } else if (new Date(s.updated_at).getTime() >= fiveDaysAgo) {
      previous.push(s);
    }
  }
  return { active, previous };
}

/**
 * Sort sessions with starred items first.
 * Preserves original order within each group (starred / unstarred).
 */
export function sortStarredFirst(
  sessions: Session[],
  starred: Set<string>,
): Session[] {
  return [...sessions].sort(
    (a, b) =>
      (starred.has(b.id) ? 1 : 0) - (starred.has(a.id) ? 1 : 0),
  );
}
