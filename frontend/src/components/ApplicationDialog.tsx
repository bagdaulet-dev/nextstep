import { useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useAuth } from "../auth";
import {
  statuses,
  statusLabels,
  type Application,
  type ApplicationInput,
  type WorkMode,
  type Status,
} from "../types";
import { today } from "../utils";
import { ErrorMessage, Modal } from "./UI";

export function ApplicationDialog({
  application,
  onClose,
  onSaved,
}: {
  application?: Application;
  onClose: () => void;
  onSaved: (application: Application) => void;
}) {
  const { client } = useAuth();
  const [draft, setDraft] = useState<ApplicationInput>(() =>
    application
      ? {
          company: application.company,
          position: application.position,
          location: application.location,
          work_mode: application.work_mode,
          job_url: application.job_url,
          status: application.status,
          notes: application.notes,
          applied_date: application.applied_date,
          follow_up_date: application.follow_up_date,
        }
      : {
          company: "",
          position: "",
          location: "",
          work_mode: "REMOTE",
          job_url: "",
          status: "APPLIED",
          notes: "",
          applied_date: today(),
          follow_up_date: null,
        },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  function update<K extends keyof ApplicationInput>(key: K, value: ApplicationInput[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setError(null);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await client.request<Application>(
        application ? `/applications/${application.id}/` : "/applications/",
        { method: application ? "PATCH" : "POST", body: draft },
      );
      onSaved(saved);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={application ? "A little refinement." : "A new possibility."}
      onClose={onClose}
      busy={busy}
      className="application-dialog"
    >
      <p className="dialog-subtitle">
        {application
          ? "Keep the details up to date."
          : "Give this opportunity a place in your workspace."}
      </p>
      <form onSubmit={(event) => void submit(event)} aria-busy={busy}>
        <div className="form-grid">
          <label>
            Company
            <input
              name="company"
              value={draft.company}
              onChange={(e) => update("company", e.target.value)}
              maxLength={120}
              required
              placeholder="e.g. Linear"
              autoComplete="off"
            />
          </label>
          <label>
            Role
            <input
              name="position"
              value={draft.position}
              onChange={(e) => update("position", e.target.value)}
              maxLength={160}
              required
              placeholder="e.g. Backend Engineer"
              autoComplete="off"
            />
          </label>
          <label>
            Location
            <input
              name="location"
              value={draft.location}
              onChange={(e) => update("location", e.target.value)}
              maxLength={120}
              placeholder="City, country, or remote"
              autoComplete="off"
            />
          </label>
          <label>
            Work arrangement
            <select
              name="work_mode"
              value={draft.work_mode}
              onChange={(e) => update("work_mode", e.target.value as WorkMode)}
            >
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
              <option value="ONSITE">On-site</option>
            </select>
          </label>
          <label>
            Status
            <select
              name="status"
              value={draft.status}
              onChange={(e) => update("status", e.target.value as Status)}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Application date
            <input
              name="applied_date"
              type="date"
              min="2000-01-01"
              max="2099-12-31"
              value={draft.applied_date}
              onChange={(e) => update("applied_date", e.target.value)}
              required
            />
          </label>
          <label className="form-wide">
            Job link <span>optional</span>
            <input
              name="job_url"
              type="url"
              value={draft.job_url}
              onChange={(e) => update("job_url", e.target.value)}
              maxLength={2048}
              placeholder="https://…"
            />
          </label>
          <label className="form-wide">
            Follow-up date <span>optional</span>
            <input
              name="follow_up_date"
              type="date"
              min={draft.applied_date}
              max="2099-12-31"
              value={draft.follow_up_date ?? ""}
              onChange={(e) => update("follow_up_date", e.target.value || null)}
            />
          </label>
          <label className="form-wide">
            Notes <span>optional</span>
            <textarea
              name="notes"
              rows={3}
              value={draft.notes}
              onChange={(e) => update("notes", e.target.value)}
              maxLength={4000}
              placeholder="Interview details, a useful contact, or what to do next…"
            />
          </label>
        </div>
        <ErrorMessage error={error} />
        <div className="dialog-actions">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="button primary" type="submit" disabled={busy}>
            {busy ? (
              <>
                <LoaderCircle size={15} className="spinner" />
                Saving…
              </>
            ) : (
              <>
                {application ? "Save changes" : "Add application"}
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
