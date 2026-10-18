
import { useEffect, useRef, useState } from 'react';

interface DeleteDialogProps {
  open: boolean;
  entryTitle: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteDialog({
  open,
  entryTitle,
  onCancel,
  onConfirm,
}: DeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      setDeleting(false);
      setError(null);
      return;
    }

    requestAnimationFrame(() => cancelButtonRef.current?.focus());
  }, [open]);

  if (!open) return null;

  async function handleConfirm() {
    setDeleting(true);
    setError(null);

    try {
      await onConfirm();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not delete this entry.',
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deleting) {
          onCancel();
        }
      }}
    >
      <section
        className="app-dialog delete-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <header className="dialog-header">
          <h2 id="delete-dialog-title">Delete entry?</h2>

          <button
            className="icon-button"
            type="button"
            aria-label="Close confirmation"
            disabled={deleting}
            onClick={onCancel}
          >
            ×
          </button>
        </header>

        <p id="delete-dialog-description">
          Are you sure you want to delete <strong>{entryTitle}</strong>? This
          action cannot be undone.
        </p>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <footer className="dialog-footer">
          <button
            ref={cancelButtonRef}
            className="secondary-button"
            type="button"
            disabled={deleting}
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            className="danger-button"
            type="button"
            disabled={deleting}
            onClick={() => void handleConfirm()}
          >
            {deleting ? 'Deleting…' : 'Delete entry'}
          </button>
        </footer>
      </section>
    </div>
  );
}
