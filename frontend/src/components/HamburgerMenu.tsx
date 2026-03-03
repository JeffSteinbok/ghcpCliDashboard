/**
 * Hamburger menu (☰) — dropdown in the header-right area, next to
 * the timestamp.
 *
 * Contains:
 *   - "Start on login" toggle (hidden when platform doesn't support it)
 *   - "Remote sync" toggle (enables/disables OneDrive sync)
 *   - Divider
 *   - "About" opens a help modal (restored from the old "What is this?" popup)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAutostart, useSettings } from "../hooks";

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const autostart = useAutostart();
  const { settings, loading: settingsLoading, setSyncEnabled } = useSettings();

  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      <div className="hamburger-wrapper" ref={menuRef}>
        <button
          className="hamburger-btn"
          onClick={toggle}
          title="Settings"
          aria-label="Open settings menu"
          aria-expanded={open}
        >
          ☰
        </button>

        {open && (
          <div className="hamburger-dropdown" role="menu">
            {/* Autostart toggle — only shown when platform supports it */}
            {autostart.supported && (
              <label className="hamburger-item hamburger-toggle" role="menuitem">
                <span>Start on login</span>
                <input
                  type="checkbox"
                  checked={autostart.enabled}
                  disabled={autostart.toggling}
                  onChange={(e) => autostart.toggle(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            )}

            {/* Remote sync toggle */}
            {!settingsLoading && (
              <label className="hamburger-item hamburger-toggle" role="menuitem">
                <span>Remote sync</span>
                <input
                  type="checkbox"
                  checked={settings.sync_enabled}
                  onChange={(e) => setSyncEnabled(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            )}

            <div className="hamburger-divider" />

            {/* About — opens help modal */}
            <button
              className="hamburger-item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setShowAbout(true);
              }}
            >
              About
            </button>
          </div>
        )}
      </div>

      {/* About modal — restored from the legacy "What is this?" popup */}
      {showAbout && (
        <div
          className="modal-overlay open"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAbout(false);
          }}
        >
          <div className="modal">
            <h2>🤖 Copilot Dashboard</h2>
            <p>
              A local dashboard that monitors all your GitHub Copilot CLI
              sessions in real-time.
            </p>
            <p>
              <a
                href="https://github.com/JeffSteinbok/ghcpCliDashboard"
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--accent)", textDecoration: "underline" }}
              >
                📖 View full documentation on GitHub
              </a>
            </p>
            <p>
              <strong>Features:</strong>
            </p>
            <ul>
              <li>
                <strong>Active vs Previous</strong> — sessions with a running
                process show in the Active tab with a live indicator; completed
                sessions are in Previous.
              </li>
              <li>
                <strong>Session states</strong> —{" "}
                <span style={{ color: "var(--green)" }}>● Working/Thinking</span>{" "}
                (actively running),{" "}
                <span style={{ color: "var(--yellow)" }}>● Waiting</span> (needs
                your input),{" "}
                <span style={{ color: "var(--accent)" }}>● Idle</span> (done,
                ready for next task).
              </li>
              <li>
                <strong>Desktop notifications</strong> — click the 🔕 button to
                enable browser notifications when sessions change state.
              </li>
              <li>
                <strong>Background tasks</strong> — sessions running subagents
                show a badge with the count of active background tasks.
              </li>
              <li>
                <strong>Grouped by project</strong> — sessions are automatically
                categorized by repository or working directory.
              </li>
              <li>
                <strong>Restart commands</strong> — each session has a
                copy-pasteable <code>copilot</code> command to resume it.
              </li>
              <li>
                <strong>Focus window</strong> — click the 📺 button on an active
                session to bring its terminal to the foreground.
              </li>
              <li>
                <strong>Tile &amp; List views</strong> — tile view for
                at-a-glance status, list view for full details.
              </li>
              <li>
                <strong>Themes</strong> — toggle light/dark mode and switch color
                palettes using the controls in the header.
              </li>
            </ul>
            <p>
              <strong>Refresh rates:</strong> Active sessions refresh every 5
              seconds. Previous sessions refresh every 30 seconds.
            </p>
            <button
              className="close-btn"
              onClick={() => setShowAbout(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
