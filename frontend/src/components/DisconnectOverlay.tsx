/**
 * Disconnect overlay — shown when the server is unreachable.
 *
 * Displays a retry countdown that matches the vanilla JS logic exactly
 * (5-second countdown, auto-retry). Mirrors dashboard.html lines 142-150
 * and dashboard.js lines 50-105.
 */

import { useDisconnect } from "../hooks";

export default function DisconnectOverlay() {
  const { disconnected, retrySeconds } = useDisconnect();

  if (!disconnected) return null;

  return (
    <div className="disconnect-overlay" style={{ display: "flex" }}>
      <div className="disconnect-popover">
        <div className="disconnect-icon">⚠️</div>
        <div className="disconnect-title">Server Not Responding</div>
        <div className="disconnect-detail">
          <strong>What was detected:</strong> The dashboard could not reach the
          server.
        </div>
        <div className="disconnect-retry">
          {retrySeconds > 0
            ? `↻ Retrying in ${retrySeconds}s…`
            : "Retrying now…"}
        </div>
      </div>
    </div>
  );
}
