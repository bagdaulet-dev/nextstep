import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  ExternalLink,
  FileText,
  MapPin,
  Pencil,
  Trash2,
} from "lucide-react";
import { useAuth } from "../auth";
import {
  modeLabels,
  statuses,
  statusLabels,
  type Application,
  type Status,
  type StatusEvent,
} from "../types";
import { formatDate } from "../utils";
import { CompanyMark, StatusBadge } from "./Applications";
import { ErrorMessage, Modal } from "./UI";

export function DetailsDrawer({
  application,
  onClose,
  onEdit,
  onDelete,
  onStatus,
}: {
  application: Application;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (status: Status) => Promise<void>;
}) {
  const { client } = useAuth();
  const [history, setHistory] = useState<StatusEvent[]>([]);
  const [tab, setTab] = useState("details");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    const controller = new AbortController();
    setHistory([]);
    client
      .request<StatusEvent[]>(`/applications/${application.id}/history/`, {
        signal: controller.signal,
      })
      .then(setHistory)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e);
      });
    return () => controller.abort();
  }, [client, application.id, application.updated_at]);
  async function changeStatus(value: Status) {
    setBusy(true);
    setError(null);
    try {
      await onStatus(value);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Opportunity details"
      onClose={onClose}
      busy={busy}
      className="details-drawer"
    >
      <div className="detail-identity">
        <CompanyMark company={application.company} large />
        <span className="detail-company">{application.company}</span>
        <h3>{application.position}</h3>
        <p>
          <MapPin size={13} />
          {application.location || modeLabels[application.work_mode]}
          <span />
          {modeLabels[application.work_mode]}
        </p>
        <StatusBadge status={application.status} />
      </div>
      <div className="detail-tabs">
        <button
          aria-pressed={tab === "details"}
          className={tab === "details" ? "selected" : ""}
          onClick={() => setTab("details")}
        >
          <FileText size={14} />
          Details
        </button>
        <button
          aria-pressed={tab === "history"}
          className={tab === "history" ? "selected" : ""}
          onClick={() => setTab("history")}
        >
          <Clock3 size={14} />
          Activity<span>{history.length}</span>
        </button>
      </div>
      <ErrorMessage error={error} />
      {tab === "details" ? (
        <div className="detail-content">
          <label className="detail-status-label">
            Application status
            <select
              aria-label="Application status"
              value={application.status}
              disabled={busy}
              onChange={(e) => void changeStatus(e.target.value as Status)}
            >
              {statuses.map((status) => (
                <option value={status} key={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <div className="detail-dates">
            <div>
              <CalendarDays size={16} />
              <span>
                Applied<strong>{formatDate(application.applied_date, true)}</strong>
              </span>
            </div>
            <div>
              <Clock3 size={16} />
              <span>
                Follow-up
                <strong>
                  {application.follow_up_date
                    ? formatDate(application.follow_up_date, true)
                    : "Not scheduled"}
                </strong>
              </span>
            </div>
          </div>
          <div className="detail-note">
            <h4>Your notes</h4>
            <p>
              {application.notes ||
                "No notes yet. Add a few details to make your next step easier."}
            </p>
          </div>
          {application.job_url && (
            <a
              className="button secondary job-link"
              href={application.job_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open job posting
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      ) : (
        <div className="history-list">
          {history.map((event) => (
            <div className="history-event" key={event.id}>
              <span className={`history-dot ${event.to_status.toLowerCase()}`} />
              <div>
                <strong>
                  {event.from_status
                    ? `${statusLabels[event.from_status]} to ${statusLabels[event.to_status]}`
                    : "Application added"}
                </strong>
                <time dateTime={event.created_at}>
                  {new Intl.DateTimeFormat(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(event.created_at))}
                </time>
              </div>
              <ArrowUpRight size={13} />
            </div>
          ))}
          <p className="history-note">
            Status changes are saved with your application. The most recent 100 changes
            are retained.
          </p>
        </div>
      )}
      <div className="drawer-footer">
        <button className="button secondary" onClick={onEdit} disabled={busy}>
          <Pencil size={14} />
          Edit details
        </button>
        <button
          className="icon-button danger-quiet"
          aria-label="Delete application"
          onClick={onDelete}
          disabled={busy}
        >
          <Trash2 size={17} />
        </button>
      </div>
    </Modal>
  );
}
