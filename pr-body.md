## Summary

Dramatically improves the **Focus Window** (📺) feature and adds several new capabilities for Windows Terminal users.

### Performance
- **Window focus is now near-instant** — replaced 12 sequential PowerShell subprocess calls (~5-20s) with a single `CreateToolhelp32Snapshot` ctypes call (~1ms)
- Diagnostics deferred to failure paths only (zero overhead on success)

### Windows Terminal Tab Switching
- Clicking 📺 now **switches to the correct WT tab**, not just the window
- Uses pywinauto UI Automation to enumerate `TabItem` controls and call `SelectionItemPattern.Select()`
- Handles multi-window WT environments (searches all WT windows for the matching tab)
- Matches tabs by session summary from `session-store.db`

### Window Focus Reliability
- Fixed `SetForegroundWindow` silently failing from background server processes
- Uses `SystemParametersInfo(SPI_SETFOREGROUNDLOCKTIMEOUT)` to temporarily allow focus changes
- Skips focus-steal workaround when target window is already in foreground

### Live Window Titles
- New `window_title` field on `ProcessInfo` — shows the live WT tab title on session tiles (🪟)
- Populated via UIA tab enumeration during process scan

### Session Sorting
- Active sessions now sort by state priority: **working > thinking > waiting > idle**
- Then by most recently updated (`updated_at` descending)
- Starred sessions still pin to top

### Dependencies
- Added `pywinauto` as optional Windows-only dependency

### Version
- Bumps to **v0.6.7**
