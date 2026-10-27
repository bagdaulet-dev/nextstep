import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  ChevronRight,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useAuth } from "./auth";
import { useWorkspace } from "./data";
import { initials } from "./utils";
import type { Application, Filters, Status, View } from "./types";
import { AccountDialog } from "./components/AccountDialog";
import { ApplicationDialog } from "./components/ApplicationDialog";
import { Applications } from "./components/Applications";
import { AuthPage } from "./components/AuthPage";
import { Brand } from "./components/Brand";
import { Dashboard } from "./components/Dashboard";
import { DetailsDrawer } from "./components/DetailsDrawer";
import { Insights } from "./components/Insights";
import { ErrorMessage, Modal, Toast } from "./components/UI";

const titles: Record<View, string> = {
  overview: "Overview",
  applications: "Applications",
  insights: "Insights",
};
const initialView = (): View => {
  const value = new URL(window.location.href).searchParams.get("view");
  return value === "applications" || value === "insights" ? value : "overview";
};

function Workspace() {
  const { client, session } = useAuth();
  const user = session!.user!;
  const [view, setView] = useState<View>(initialView);
  const [menu, setMenu] = useState(false);
  const [filters, setFilterState] = useState<Filters>({
    search: "",
    status: "",
    work_mode: "",
    ordering: "newest",
    page: 1,
  });
  const data = useWorkspace(filters, view !== "applications");
  const [selected, setSelected] = useState<Application | null>(null);
  const [editor, setEditor] = useState<Application | "new" | null>(null);
  const [account, setAccount] = useState(false);
  const [deleting, setDeleting] = useState<Application | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);
  const [toast, setToast] = useState("");
  const closeToast = useCallback(() => setToast(""), []);
  function navigate(next: View, status: Status | "" = "") {
    setView(next);
    setMenu(false);
    setFilterState((previous) => ({ ...previous, status, page: 1 }));
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    window.history.pushState(null, "", url);
  }
  useEffect(() => {
    const listener = () => {
      setView(initialView());
      setMenu(false);
    };
    window.addEventListener("popstate", listener);
    return () => window.removeEventListener("popstate", listener);
  }, []);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k" &&
        !document.querySelector("dialog[open]")
      ) {
        event.preventDefault();
        setView("applications");
        const url = new URL(window.location.href);
        url.searchParams.set("view", "applications");
        window.history.replaceState(null, "", url);
        requestAnimationFrame(() =>
          document.getElementById("application-search")?.focus(),
        );
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  async function changeStatus(application: Application, status: Status) {
    if (status === application.status) return;
    setActionError(null);
    const updated = await client.request<Application>(
      `/applications/${application.id}/`,
      { method: "PATCH", body: { status } },
    );
    if (selected?.id === application.id) setSelected(updated);
    data.refresh();
    setToast("Status updated.");
  }
  async function remove() {
    if (!deleting || deleteBusy) return;
    setDeleteBusy(true);
    setActionError(null);
    try {
      await client.request(`/applications/${deleting.id}/`, { method: "DELETE" });
      setDeleting(null);
      setSelected(null);
      setFilterState((previous) => ({ ...previous, page: 1 }));
      data.refresh();
      setToast("Application deleted.");
    } catch (e) {
      setActionError(e);
    } finally {
      setDeleteBusy(false);
    }
  }
  const add = () => {
    setActionError(null);
    setEditor("new");
  };
  return (
    <div className={`workspace-shell ${menu ? "mobile-menu-open" : ""}`}>
      <a className="skip-link" href="#workspace-main">
        Skip to workspace
      </a>
      <aside className="sidebar">
        <a
          className="sidebar-brand"
          href="/"
          onClick={(event) => {
            if (!event.metaKey && !event.ctrlKey) {
              event.preventDefault();
              navigate("overview");
            }
          }}
        >
          <Brand />
        </a>
        <button
          className="icon-button mobile-menu-toggle"
          aria-label={menu ? "Close navigation" : "Open navigation"}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X size={21} /> : <Menu size={21} />}
        </button>
        <div className="sidebar-navigation">
          <p className="nav-section-label">Your workspace</p>
          <nav aria-label="Workspace views">
            {(
              [
                ["overview", LayoutDashboard],
                ["applications", BriefcaseBusiness],
                ["insights", ChartNoAxesCombined],
              ] as const
            ).map(([name, Icon]) => (
              <a
                key={name}
                href={`/?view=${name}`}
                className={`nav-item ${view === name ? "active" : ""}`}
                aria-current={view === name ? "page" : undefined}
                onClick={(event) => {
                  if (!event.metaKey && !event.ctrlKey) {
                    event.preventDefault();
                    navigate(name);
                  }
                }}
              >
                <Icon size={18} strokeWidth={1.7} />
                {titles[name]}
                {name === "applications" && (
                  <span className="nav-counter">{data.stats?.total ?? 0}</span>
                )}
              </a>
            ))}
          </nav>
          <div className="sidebar-divider" />
          <p className="nav-section-label">A closer look</p>
          <button
            className="stage-nav"
            onClick={() => navigate("applications", "APPLIED")}
          >
            <span className="stage-dot applied" />
            Awaiting response<span>{data.stats?.by_status.APPLIED ?? 0}</span>
          </button>
          <button
            className="stage-nav"
            onClick={() => navigate("applications", "INTERVIEW")}
          >
            <span className="stage-dot interview" />
            Interviews<span>{data.stats?.by_status.INTERVIEW ?? 0}</span>
          </button>
          <button className="stage-nav" onClick={() => navigate("applications", "OFFER")}>
            <span className="stage-dot offer" />
            Offers<span>{data.stats?.by_status.OFFER ?? 0}</span>
          </button>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-message">
            <span className="sidebar-spark">
              <Sparkles size={19} strokeWidth={1.5} />
            </span>
            <strong>
              A little progress.
              <br />A new perspective.
            </strong>
            <p>
              Every step belongs to
              <br />
              your bigger picture.
            </p>
          </div>
          <button
            className="user-button"
            onClick={() => {
              setAccount(true);
              setMenu(false);
            }}
            aria-label="Open account settings"
          >
            <span className="avatar">{initials(user.name)}</span>
            <span>
              <strong>{user.name}</strong>
              <small>{user.is_demo ? "Demo workspace" : "Personal workspace"}</small>
            </span>
            <ChevronRight size={14} />
          </button>
        </div>
      </aside>
      <main className="workspace-main" id="workspace-main" tabIndex={-1}>
        <header className="workspace-topbar">
          <div className="breadcrumbs">
            <span>Workspace</span>
            <ChevronRight size={12} />
            <strong>{titles[view]}</strong>
            {user.is_demo && <span className="demo-chip">Demo</span>}
          </div>
          <div className="topbar-actions">
            <button
              className="topbar-search"
              aria-label="Open application search"
              onClick={() => {
                navigate("applications");
                requestAnimationFrame(() =>
                  document.getElementById("application-search")?.focus(),
                );
              }}
            >
              <Search size={16} />
              <span>Search</span>
              <kbd>⌘ K</kbd>
            </button>
            <button className="button primary topbar-add" onClick={add}>
              <Plus size={16} />
              <span>Add application</span>
            </button>
          </div>
        </header>
        <div className="workspace-content">
          <ErrorMessage error={data.error || (!deleting && actionError)} />
          {view === "overview" ? (
            <Dashboard
              name={user.name}
              stats={data.stats}
              page={data.applications}
              loading={data.loading}
              add={add}
              open={setSelected}
              browse={(status) => navigate("applications", status)}
              onStatus={(application, status) =>
                changeStatus(application, status).catch(setActionError)
              }
            />
          ) : view === "applications" ? (
            <Applications
              page={data.applications}
              stats={data.stats}
              loading={data.loading}
              filters={filters}
              setFilters={(changes) =>
                setFilterState((previous) => ({ ...previous, ...changes }))
              }
              open={setSelected}
              add={add}
              onStatus={(application, status) =>
                changeStatus(application, status).catch(setActionError)
              }
            />
          ) : (
            <Insights stats={data.stats} />
          )}
          <footer className="workspace-footer">
            <span>
              <LockKeyhole size={12} />
              Private to your account
            </span>
            <span>
              A little closer to what’s next.
              <ArrowUpRight size={12} />
            </span>
          </footer>
        </div>
      </main>
      {editor && (
        <ApplicationDialog
          application={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
          onSaved={(application) => {
            const editing = editor !== "new";
            setEditor(null);
            if (editing) setSelected(application);
            setFilterState((previous) => ({ ...previous, page: 1 }));
            data.refresh();
            setToast(editing ? "Application updated." : "A new opportunity added.");
          }}
        />
      )}
      {selected && !editor && !deleting && (
        <DetailsDrawer
          application={selected}
          onClose={() => setSelected(null)}
          onEdit={() => setEditor(selected)}
          onDelete={() => {
            setDeleting(selected);
            setActionError(null);
          }}
          onStatus={(status) => changeStatus(selected, status)}
        />
      )}
      {account && (
        <AccountDialog user={user} onClose={() => setAccount(false)} notify={setToast} />
      )}
      {deleting && (
        <Modal
          title="Let this one go?"
          onClose={() => setDeleting(null)}
          busy={deleteBusy}
          className="confirm-dialog"
        >
          <p>
            This permanently removes your {deleting.position} application at{" "}
            <strong>{deleting.company}</strong>, including its notes and status history.
          </p>
          <ErrorMessage error={actionError} />
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setDeleting(null)}
              disabled={deleteBusy}
            >
              Keep application
            </button>
            <button
              className="button danger"
              disabled={deleteBusy}
              onClick={() => void remove()}
            >
              {deleteBusy ? "Deleting…" : "Delete application"}
            </button>
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast} onClose={closeToast} />}
    </div>
  );
}

export default function App() {
  const auth = useAuth();
  if (auth.loading)
    return (
      <div className="boot-screen">
        <Brand />
        <span className="loading-orb" />
        <p>Opening your workspace…</p>
      </div>
    );
  return auth.session?.user ? <Workspace key={auth.session.user.id} /> : <AuthPage />;
}
