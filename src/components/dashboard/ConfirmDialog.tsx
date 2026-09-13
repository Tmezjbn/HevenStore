import { Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Destructive styling for the confirm button */
  danger?: boolean;
  busy?: boolean;
  /** Failed confirm action — rendered inside the dialog so it's not hidden behind the overlay. */
  error?: string | null;
};

/** Shared yes/no dialog — replaces native `window.confirm` (EN-only chrome). */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel,
  cancelLabel,
  danger = false,
  busy = false,
  error = null,
}: Props) {
  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} label={title} closeLabel={cancelLabel}>
      <h3 className="font-bold text-lg text-balance">{title}</h3>
      {body ? <p className="py-3 text-sm text-base-content/70 text-pretty">{body}</p> : <div className="py-2" />}
      {error ? (
        <p className="pb-2 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="modal-action mt-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`btn btn-sm gap-2 ${danger ? 'btn-error' : 'btn-primary'}`}
          disabled={busy}
          onClick={() => void onConfirm()}
        >
          {busy && <Loader2 size={14} className="animate-spin" aria-hidden />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
