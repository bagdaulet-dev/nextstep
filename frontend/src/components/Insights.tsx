import { TrendingUp } from "lucide-react";
import type { Stats } from "../types";
import { ActivityChart, StatusDistribution } from "./Charts";

export function Insights({ stats }: { stats: Stats | null }) {
  return (
    <section className="insights-view page-reveal">
      <div className="view-heading">
        <div>
          <p className="page-eyebrow">A different perspective.</p>
          <h1>See your momentum.</h1>
          <p>Your applications, brought into a clearer picture.</p>
        </div>
        <span className="insights-symbol">
          <TrendingUp size={26} strokeWidth={1.4} />
        </span>
      </div>
      <div className="insight-summary">
        <div>
          <span>Tracked opportunities</span>
          <strong>{stats?.total ?? 0}</strong>
        </div>
        <div>
          <span>Active applications</span>
          <strong>{stats?.active ?? 0}</strong>
        </div>
        <div>
          <span>Entered this week</span>
          <strong>{stats?.applied_this_week ?? 0}</strong>
        </div>
      </div>
      <div className="insights-grid">
        <section className="insight-panel">
          <div className="panel-heading">
            <div>
              <h2>Your application activity</h2>
              <p>Grouped by application date, over eight weeks.</p>
            </div>
          </div>
          {stats && <ActivityChart activity={stats.activity} />}
        </section>
        <section className="insight-panel">
          <div className="panel-heading">
            <div>
              <h2>Where things stand</h2>
              <p>Current stages across your workspace.</p>
            </div>
          </div>
          {stats && <StatusDistribution stats={stats} />}
        </section>
      </div>
      <p className="insight-footnote">
        These summaries reflect what you enter in Nextstep. They track your progress, not
        hiring predictions.
      </p>
    </section>
  );
}
