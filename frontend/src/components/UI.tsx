import { useEffect, useId, useRef, type ReactNode } from "react";
import { Check, X, AlertCircle } from "lucide-react";
import { ApiError } from "../api";

export function Modal({
  title,
  onClose,
  children,
  busy = false,
  className = "",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${className}`}
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current && !busy) {
          const box = ref.current.getBoundingClientRect();
          if (
            event.clientX < box.left ||
            event.clientX > box.right ||
            event.clientY < box.top ||
            event.clientY > box.bottom
          )
            onClose();
        }
      }}
    >
      <div className="dialog-heading">
        <h2 id={id}>{title}</h2>
        <button
          type="button"
          className="icon-button close-button"
          aria-label="Close dialog"
          onClick={onClose}
          disabled={busy}
        >
          <X size={19} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function ErrorMessage({ error }: { error: unknown }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) ref.current?.focus();
  }, [error]);
  if (!error) return null;
  return (
    <div ref={ref} className="error-message" role="alert" tabIndex={-1}>
      <AlertCircle size={16} />
      <div>
        {error instanceof Error ? error.message : String(error)}
        {error instanceof ApiError && Object.keys(error.fields).length > 0 && (
          <ul>
            {Object.entries(error.fields).map(([field, messages]) => (
              <li key={field}>
                {field.replaceAll("_", " ")}: {messages.join(" ")}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);
  return (
    <div className="toast" role="status">
      <span>
        <Check size={16} />
      </span>
      {message}
      <button className="icon-button" aria-label="Dismiss notification" onClick={onClose}>
        <X size={14} />
      </button>
    </div>
  );
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-symbol" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
