import { useEffect, useRef, useSyncExternalStore } from "react";
import { RETRY_COUNTDOWN_SECONDS, RETRY_TICK_MS } from "../constants";
import { isDisconnected, useAppState } from "../state";

// External store for countdown — avoids setState-in-effect lint warnings
let _retrySeconds = 0;
let _retryAttempts = 0;
let _listeners: Set<() => void> = new Set();
function getRetrySnapshot() { return _retrySeconds; }
function getAttemptsSnapshot() { return _retryAttempts; }
function subscribeRetry(cb: () => void) {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}
function setRetry(v: number) {
  _retrySeconds = v;
  _listeners.forEach((cb) => cb());
}
function setAttempts(v: number) {
  _retryAttempts = v;
  _listeners.forEach((cb) => cb());
}

/**
 * Tracks disconnect state with a looping 5-second retry countdown
 * and an attempt counter so the user sees continuous progress.
 */
export function useDisconnect() {
  const state = useAppState();
  const disconnected = isDisconnected(state);
  const retrySeconds = useSyncExternalStore(subscribeRetry, getRetrySnapshot);
  const retryAttempts = useSyncExternalStore(subscribeRetry, getAttemptsSnapshot);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevDisconnected = useRef(disconnected);

  useEffect(() => {
    if (disconnected && !prevDisconnected.current) {
      // Entering disconnected state — start looping countdown
      setAttempts(0);
      setRetry(RETRY_COUNTDOWN_SECONDS);
      timerRef.current = setInterval(() => {
        const next = _retrySeconds - 1;
        if (next <= 0) {
          // Restart countdown and bump attempt counter
          setAttempts(_retryAttempts + 1);
          setRetry(RETRY_COUNTDOWN_SECONDS);
        } else {
          setRetry(next);
        }
      }, RETRY_TICK_MS);
    } else if (!disconnected && prevDisconnected.current) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRetry(0);
      setAttempts(0);
    }
    prevDisconnected.current = disconnected;

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [disconnected]);

  return { disconnected, retrySeconds, retryAttempts };
}
