
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

export default function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) return;

    const timeoutId = window.setTimeout(onDismiss, 4000);

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
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      <div className={`toast toast-${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
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
      </div>
    </div>
  );
}
