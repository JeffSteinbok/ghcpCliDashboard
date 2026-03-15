/**
 * Styled confirmation dialog — replaces native confirm().
 *
 * Matches the app's modal design system with themed buttons,
 * backdrop click to cancel, and Escape key support.
 */

import { useEffect, useCallback } from "react";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    },
    [onCancel],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onCancel();
  };

  return (
    <div className="confirm-modal-overlay open" onClick={handleOverlayClick}>
      <div className="confirm-modal">
        <div className="confirm-modal-header">
          <h2>{title}</h2>
        </div>
        <p className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-actions">
          <button className="confirm-btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="confirm-btn-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
