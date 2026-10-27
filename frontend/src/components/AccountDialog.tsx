import { useState, type FormEvent } from "react";
import { Download, LockKeyhole, LogOut, Trash2 } from "lucide-react";
import { useAuth } from "../auth";
import type { Session, User } from "../types";
import { downloadJson, initials } from "../utils";
import { ErrorMessage, Modal } from "./UI";

export function AccountDialog({
  user,
  onClose,
  notify,
}: {
  user: User;
  onClose: () => void;
  notify: (message: string) => void;
}) {
  const { client, accept } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  async function exportData() {
    setBusy(true);
    setError(null);
    try {
      downloadJson(await client.request("/auth/export/"), "nextstep-workspace.json");
      notify("Your workspace was exported.");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    setError(null);
    try {
      accept(await client.request<Session>("/auth/logout/", { method: "POST" }));
      onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function remove(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      accept(
        await client.request<Session>("/auth/delete/", {
          method: "POST",
          body: { confirmation, password },
        }),
      );
      onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Your workspace."
      onClose={onClose}
      busy={busy}
      className="account-dialog"
    >
      <div className="account-profile">
        <span className="avatar large">{initials(user.name)}</span>
        <div>
          <strong>{user.name}</strong>
          <span>{user.is_demo ? "Temporary demo account" : user.email}</span>
        </div>
      </div>
      <div className="privacy-callout">
        <LockKeyhole size={16} />
        <p>
          Your applications are private to your account.
          {user.is_demo &&
            " Demo access lasts for 24 hours. Use a personal account to keep your own applications."}
        </p>
      </div>
      <ErrorMessage error={error} />
      {deleting ? (
        <form onSubmit={(event) => void remove(event)} className="account-delete-form">
          <h3>Delete this account?</h3>
          <p>
            This permanently removes the account, applications, notes, and status history.
          </p>
          <label>
            Type DELETE to confirm
            <input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              required
              pattern="DELETE"
              autoComplete="off"
            />
          </label>
          {!user.is_demo && (
            <label>
              Current password
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                autoComplete="current-password"
                maxLength={128}
              />
            </label>
          )}
          <div className="dialog-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => setDeleting(false)}
              disabled={busy}
            >
              Keep my account
            </button>
            <button className="button danger" type="submit" disabled={busy}>
              Delete account
            </button>
          </div>
        </form>
      ) : (
        <div className="account-options">
          <button disabled={busy} onClick={() => void exportData()}>
            <Download size={17} />
            <span>
              <strong>Export your data</strong>
              <small>Download your applications as JSON</small>
            </span>
          </button>
          <button disabled={busy} onClick={() => void signOut()}>
            <LogOut size={17} />
            <span>
              <strong>Sign out</strong>
              <small>Close this browser’s session</small>
            </span>
          </button>
          <button
            disabled={busy}
            className="danger-quiet"
            onClick={() => setDeleting(true)}
          >
            <Trash2 size={17} />
            <span>
              <strong>Delete account</strong>
              <small>Remove your account and its data</small>
            </span>
          </button>
        </div>
      )}
    </Modal>
  );
}
