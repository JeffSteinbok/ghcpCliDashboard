/**
 * Hook that checks autostart status once on mount and provides
 * state for the autostart prompt popover.
 */

import { useEffect, useState, useCallback } from "react";
import { fetchAutostartStatus, enableAutostart } from "../api";

const DISMISSED_KEY = "copilot-dashboard-autostart-dismissed";

interface AutostartState {
  /** Whether to show the popover prompt */
  showPrompt: boolean;
  /** User clicked "Enable" — request in flight */
  enabling: boolean;
  /** Call to enable autostart */
  enable: () => void;
  /** Call to dismiss the popover permanently */
  dismiss: () => void;
}

export function useAutostart(): AutostartState {
  const [showPrompt, setShowPrompt] = useState(false);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    // Don't prompt if user previously dismissed
    if (localStorage.getItem(DISMISSED_KEY)) return;

    fetchAutostartStatus()
      .then((status) => {
        if (status.supported && !status.enabled) {
          setShowPrompt(true);
        }
      })
      .catch(() => {});
  }, []);

  const enable = useCallback(() => {
    setEnabling(true);
    enableAutostart()
      .then((res) => {
        if (res.success) {
          localStorage.setItem(DISMISSED_KEY, "1");
          setShowPrompt(false);
        } else {
          alert(`Could not enable autostart: ${res.message}`);
        }
      })
      .catch(() => alert("Failed to enable autostart."))
      .finally(() => setEnabling(false));
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShowPrompt(false);
  }, []);

  return { showPrompt, enabling, enable, dismiss };
}
