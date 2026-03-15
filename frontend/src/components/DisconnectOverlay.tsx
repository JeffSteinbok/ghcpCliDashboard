/**
 * Disconnect overlay — shown when the server is unreachable.
 *
 * Shows a looping retry countdown with attempt counter.
 * When a version update is in progress, displays reassuring
 * update-specific messaging instead of the generic error.
 */

import { useDisconnect } from "../hooks";
import { useAppState } from "../state";

export default function DisconnectOverlay() {
  const { disconnected, retrySeconds, retryAttempts } = useDisconnect();
  const { updating, updateTarget } = useAppState();

  if (!disconnected) return null;

  const isUpdating = updating;

  return (
    <div className="disconnect-overlay" style={{ display: "flex" }}>
      <div
        className="disconnect-popover"
        style={isUpdating ? { borderColor: "var(--accent)" } : undefined}
      >
        <div className="disconnect-icon">{isUpdating ? "🔄" : "⚠️"}</div>
        <div
          className="disconnect-title"
          style={isUpdating ? { color: "var(--accent)" } : undefined}
        >
          {isUpdating ? "Updating Server" : "Server Not Responding"}
        </div>
        <div className="disconnect-detail">
          {isUpdating ? (
            <>
              Updating to <strong>v{updateTarget}</strong> — the server will
              restart automatically. This may take a minute.
            </>
          ) : (
            <>
              <strong>What was detected:</strong> The dashboard could not reach
              the server.
            </>
          )}
        </div>
        <div className="disconnect-retry">
          ↻ Retrying in {retrySeconds}s…
          {retryAttempts > 0 && (
            <span className="disconnect-attempts">
              {" "}
              (attempt {retryAttempts})
            </span>
          )}
        </div>
        <button
          className="disconnect-reload-btn"
          onClick={() => location.reload()}
        >
          ⟳ Reload Page
        </button>
      </div>
    </div>
  );
}
