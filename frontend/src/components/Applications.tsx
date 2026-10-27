import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type { Application, Filters, Page, Stats, Status } from "../types";
import { modeLabels, statuses, statusLabels } from "../types";
import { companyColor, formatDate } from "../utils";
import { EmptyState } from "./UI";

export function CompanyMark({
  company,
  large = false,
}: {
  company: string;
  large?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`company-mark company-color-${companyColor(company)} ${large ? "large" : ""}`}
    >
      {company.slice(0, 1).toUpperCase()}
    </span>
  );
}
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`status-badge ${status.toLowerCase()}`}>
      <span />
      {statusLabels[status]}
    </span>
  );
}

type TableProps = {
  page: Page<Application> | null;
  loading: boolean;
  open: (application: Application) => void;
  add: () => void;
  onStatus: (application: Application, status: Status) => Promise<void>;
};
export function ApplicationTable({ page, loading, open, add, onStatus }: TableProps) {
  const filtered =
    new URLSearchParams(window.location.search).get("view") === "applications";
  if (!page && loading)
    return (
      <div className="table-loading" role="status">
        <span className="loading-orb" />
        Opening your opportunities…
      </div>
    );
  if (!page?.results.length)
    return (
      <EmptyState
        title={
          filtered ? "A little room for possibility." : "Your next chapter starts here."
        }
        description={
          filtered
            ? "No applications match this view. Try another search or add a new opportunity."
            : "Add your first application to bring your job search into focus."
        }
      >
        <button className="button primary small" onClick={add}>
          <Plus size={15} />
          Add an application
        </button>
      </EmptyState>
    );
  return (
    <div
      className={`application-table-wrap ${loading ? "is-refreshing" : ""}`}
      aria-busy={loading}
    >
      <table className="application-table">
        <thead>
          <tr>
            <th>Company & role</th>
            <th>Status</th>
            <th className="location-column">Location</th>
            <th className="date-column">Applied</th>
            <th>
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {page.results.map((application) => (
            <tr key={application.id}>
              <td>
                <button className="company-cell" onClick={() => open(application)}>
                  <CompanyMark company={application.company} />
                  <span>
                    <strong>{application.company}</strong>
                    <small>{application.position}</small>
                  </span>
                </button>
              </td>
              <td>
                <div className={`status-select-wrap ${application.status.toLowerCase()}`}>
                  <span className="status-dot" />
                  <select
                    aria-label={`Status for ${application.company}`}
                    value={application.status}
                    onChange={(event) =>
                      void onStatus(application, event.target.value as Status)
                    }
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </div>
              </td>
              <td className="location-column">
                <span className="location-text">
                  <MapPin size={12} />
                  {application.location || modeLabels[application.work_mode]}
                </span>
              </td>
              <td className="date-column">
                <span className="date-text">{formatDate(application.applied_date)}</span>
              </td>
              <td>
                <button
                  className="icon-button row-open"
                  aria-label={`View ${application.company} application`}
                  onClick={() => open(application)}
                >
                  <ArrowUpRight size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Applications({
  page,
  stats,
  loading,
  filters,
  setFilters,
  open,
  add,
  onStatus,
}: TableProps & {
  stats: Stats | null;
  filters: Filters;
  setFilters: (changes: Partial<Filters>) => void;
}) {
  return (
    <section className="applications-view page-reveal">
      <div className="view-heading">
        <div>
          <p className="page-eyebrow">Every opportunity has a place.</p>
          <h1>Your applications.</h1>
          <p>Keep the roles, conversations, and details together.</p>
        </div>
        <span className="collection-count">{page?.count ?? 0} opportunities</span>
      </div>
      <div className="application-filter-tabs" aria-label="Filter applications by status">
        {(["", ...statuses] as const).map((status) => (
          <button
            key={status || "all"}
            className={filters.status === status ? "selected" : ""}
            aria-pressed={filters.status === status}
            onClick={() => setFilters({ status, page: 1 })}
          >
            {status ? statusLabels[status] : "All applications"}
            <span>{status ? (stats?.by_status[status] ?? 0) : (stats?.total ?? 0)}</span>
          </button>
        ))}
      </div>
      <div className="collection-panel">
        <div className="collection-toolbar">
          <label className="search-field">
            <Search size={16} />
            <input
              id="application-search"
              aria-label="Search applications"
              placeholder="Search company or role…"
              value={filters.search}
              maxLength={100}
              onChange={(event) => setFilters({ search: event.target.value, page: 1 })}
            />
            <kbd>⌘ K</kbd>
          </label>
          <div className="toolbar-select">
            <SlidersHorizontal size={14} />
            <select
              aria-label="Filter by work mode"
              value={filters.work_mode}
              onChange={(event) =>
                setFilters({
                  work_mode: event.target.value as Filters["work_mode"],
                  page: 1,
                })
              }
            >
              <option value="">All work modes</option>
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
              <option value="ONSITE">On-site</option>
            </select>
          </div>
          <select
            className="sort-select"
            aria-label="Sort applications"
            value={filters.ordering}
            onChange={(event) =>
              setFilters({ ordering: event.target.value as Filters["ordering"], page: 1 })
            }
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="company">Company name</option>
          </select>
        </div>
        <ApplicationTable
          page={page}
          loading={loading}
          open={open}
          add={add}
          onStatus={onStatus}
        />
        <div className="pagination">
          <span>
            {page?.count
              ? `${(filters.page - 1) * 20 + 1}–${Math.min(filters.page * 20, page.count)} of ${page.count}`
              : "No applications to show"}
          </span>
          <div>
            <button
              aria-label="Previous page"
              className="icon-button"
              disabled={!page?.previous || loading}
              onClick={() => setFilters({ page: filters.page - 1 })}
            >
              <ChevronLeft size={16} />
            </button>
            <span>Page {filters.page}</span>
            <button
              aria-label="Next page"
              className="icon-button"
              disabled={!page?.next || loading}
              onClick={() => setFilters({ page: filters.page + 1 })}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
