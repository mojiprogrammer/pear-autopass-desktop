

import { useEffect } from 'react';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

const TOAST_DURATION = 4000;

export default function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) return;

    const timeoutId = window.setTimeout(onDismiss, TOAST_DURATION);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toast?.id, onDismiss]);

  if (!toast) return null;

  const icon = {
    success: '✓',
    error: '!',
    info: 'i',
  }[toast.type];

  return (
    <div
      className="toast-container"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <div
        key={toast.id}
        className={`toast toast-${toast.type}`}
        role={toast.type === 'error' ? 'alert' : 'status'}
      >
        <span className="toast-icon" aria-hidden="true">
          {icon}
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

