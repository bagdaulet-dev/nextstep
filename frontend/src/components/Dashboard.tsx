import { ArrowRight, ArrowUpRight, CalendarDays, Plus } from "lucide-react";
import type { Application, Page, Stats, Status } from "../types";
import { firstName, formatDate, today } from "../utils";
import { GlassOrbit } from "./GlassOrbit";
import { ActivityChart } from "./Charts";
import { ApplicationTable, CompanyMark } from "./Applications";

export function Dashboard({
  name,
  stats,
  page,
  loading,
  add,
  open,
  browse,
  onStatus,
}: {
  name: string;
  stats: Stats | null;
  page: Page<Application> | null;
  loading: boolean;
  add: () => void;
  open: (application: Application) => void;
  browse: (status?: Status) => void;
  onStatus: (application: Application, status: Status) => Promise<void>;
}) {
  return (
    <div className="dashboard page-reveal">
      <section className="overview-hero">
        <div className="hero-copy">
          <p className="greeting">
            Hello, {firstName(name)}
            <span className="greeting-dot" />
            {new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric" }).format(
              new Date(),
            )}
          </p>
          <h1>
            Your job search,
            <br />
            in focus.
          </h1>
          <p>
            Keep every opportunity organized.
            <br />
            Make room for your next chapter.
          </p>
          <button className="button hero-button" onClick={() => browse()}>
            Explore your applications
            <ArrowRight size={15} />
          </button>
        </div>
        <GlassOrbit
          total={stats?.total ?? 0}
          interviews={stats?.by_status.INTERVIEW ?? 0}
          offers={stats?.by_status.OFFER ?? 0}
        />
      </section>
      <section className="summary-strip" aria-label="Application summary">
        <button onClick={() => browse()}>
          <span>
            Total applications
            <ArrowUpRight size={13} />
          </span>
          <strong>{stats?.total ?? "—"}</strong>
          <small>Your search, all together</small>
        </button>
        <button onClick={() => browse("APPLIED")}>
          <span>
            Awaiting a response
            <ArrowUpRight size={13} />
          </span>
          <strong>
            {stats?.by_status.APPLIED ?? "—"}
            <i className="metric-dot graphite" />
          </strong>
          <small>Applications at the first stage</small>
        </button>
        <button onClick={() => browse("INTERVIEW")}>
          <span>
            Interviews
            <ArrowUpRight size={13} />
          </span>
          <strong>
            {stats?.by_status.INTERVIEW ?? "—"}
            <i className="metric-dot violet" />
          </strong>
          <small>One conversation closer</small>
        </button>
        <button onClick={() => browse("OFFER")}>
          <span>
            Offers received
            <ArrowUpRight size={13} />
          </span>
          <strong>
            {stats?.by_status.OFFER ?? "—"}
            <i className="metric-dot green" />
          </strong>
          <small>New possibilities ahead</small>
        </button>
      </section>
      <div className="overview-grid">
        <section className="recent-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent applications</h2>
              <p>A little progress, at a glance.</p>
            </div>
            <button className="text-button" onClick={() => browse()}>
              View all
              <ArrowRight size={13} />
            </button>
          </div>
          <ApplicationTable
            page={page}
            loading={loading}
            open={open}
            add={add}
            onStatus={onStatus}
          />
          <button className="add-row" onClick={add}>
            <Plus size={15} />
            Add a new opportunity
          </button>
        </section>
        <aside className="overview-aside">
          <section className="followup-panel">
            <div className="panel-heading">
              <h2>Next follow-ups</h2>
              <CalendarDays size={16} />
            </div>
            {stats?.follow_ups.length ? (
              <div className="followup-list">
                {stats.follow_ups.map((application) => (
                  <button key={application.id} onClick={() => open(application)}>
                    <CompanyMark company={application.company} />
                    <span>
                      <strong>{application.company}</strong>
                      <small>
                        {application.follow_up_date &&
                          formatDate(application.follow_up_date)}
                        {application.follow_up_date &&
                        application.follow_up_date < today()
                          ? " · overdue"
                          : ""}
                      </small>
                    </span>
                    <ArrowUpRight size={14} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="followup-empty">
                <span className="calendar-symbol">
                  <CalendarDays size={22} strokeWidth={1.3} />
                </span>
                <p>
                  A little space to plan.
                  <br />
                  <span>Add a follow-up date to an application.</span>
                </p>
              </div>
            )}
          </section>
          <section className="activity-panel">
            <div className="panel-heading">
              <h2>A steady rhythm</h2>
              <span>8 weeks</span>
            </div>
            {stats && <ActivityChart activity={stats.activity} compact />}
            <p>
              <strong>{stats?.applied_this_week ?? 0}</strong> applications entered this
              week
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
