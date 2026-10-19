
import { useEffect } from "react";

export interface ToastMessage {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

const TOAST_DURATION_MS = 4_000;

const TOAST_ICONS: Record<ToastMessage["type"], string> = {
  success: "✓",
  error: "!",
  info: "i",
};

export default function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(
      onDismiss,
      TOAST_DURATION_MS,
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toast?.id, onDismiss]);

  if (!toast) {
    return null;
  }

  const isError = toast.type === "error";

  return (
    <div
      className="toast-container"
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
    >
      <div
        key={toast.id}
        className={`toast toast-${toast.type}`}
        role={isError ? "alert" : "status"}
      >
        <span className="toast-icon" aria-hidden="true">
          {TOAST_ICONS[toast.type]}
        </span>

        <span className="toast-message">{toast.message}</span>

        <button
          className="toast-dismiss"
          type="button"
          aria-label="Dismiss notification"
          onClick={onDismiss}
        >
          ×
        </button>

        <div className="toast-progress-track" aria-hidden="true">
          <div className="toast-progress-bar" />
        </div>
      </div>
    </div>
  );
}
