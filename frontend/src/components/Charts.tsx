import { formatDate } from "../utils";
import type { Stats } from "../types";
import { statuses, statusLabels } from "../types";

export function ActivityChart({
  activity,
  compact = false,
}: {
  activity: Stats["activity"];
  compact?: boolean;
}) {
  const max = Math.max(1, ...activity.map((item) => item.count));
  return (
    <div className={`activity-chart ${compact ? "compact" : ""}`}>
      <svg
        viewBox="0 0 520 170"
        role="img"
        aria-label="Applications entered over the last eight weeks"
      >
        <line x1="20" y1="130" x2="500" y2="130" className="chart-baseline" />
        {activity.map((week, index) => {
          const height = Math.max(week.count ? 5 : 2, (week.count / max) * 100);
          const x = 27 + index * 61;
          return (
            <g key={week.week}>
              <title>
                {formatDate(week.week)}: {week.count} applications
              </title>
              <rect
                className={`chart-bar ${index === 7 ? "current" : ""}`}
                x={x}
                y={130 - height}
                width="34"
                height={height}
                rx="6"
              />
              {!compact && (
                <text x={x + 17} y={119 - height} className="chart-value">
                  {week.count}
                </text>
              )}
              {!compact && (
                <text x={x + 17} y="154" className="chart-label">
                  {formatDate(week.week)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <ul className="sr-only">
        {activity.map((week) => (
          <li key={week.week}>
            Week of {formatDate(week.week)}: {week.count} applications
          </li>
        ))}
      </ul>
    </div>
  );
}
export function StatusDistribution({ stats }: { stats: Stats }) {
  return (
    <div className="distribution">
      {statuses.map((status) => {
        const percent = stats.total ? (stats.by_status[status] / stats.total) * 100 : 0;
        return (
          <div className="distribution-row" key={status}>
            <div>
              <span className={`status-dot ${status.toLowerCase()}`} />
              {statusLabels[status]}
              <strong>{stats.by_status[status]}</strong>
            </div>
            <svg viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true">
              <rect width="100" height="4" rx="2" className="distribution-track" />
              <rect
                width={percent}
                height="4"
                rx="2"
                className={`distribution-fill ${status.toLowerCase()}`}
              />
            </svg>
          </div>
        );
      })}
    </div>
  );
}
