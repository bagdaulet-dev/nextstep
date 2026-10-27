import { useCallback, useEffect, useState } from "react";
import { ApiError } from "./api";
import { useAuth } from "./auth";
import type { Application, Filters, Page, Stats } from "./types";

export function useWorkspace(filters: Filters, overview: boolean) {
  const { client } = useAuth();
  const [applications, setApplications] = useState<Page<Application> | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState(filters.search);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(filters.search), 250);
    return () => clearTimeout(timer);
  }, [filters.search]);
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({
      page: String(overview ? 1 : filters.page),
      page_size: overview ? "5" : "20",
      ordering: filters.ordering,
    });
    if (!overview && search) query.set("search", search);
    if (!overview && filters.status) query.set("status", filters.status);
    if (!overview && filters.work_mode) query.set("work_mode", filters.work_mode);
    setLoading(true);
    setError(null);
    Promise.all([
      client.request<Page<Application>>(`/applications/?${query}`, {
        signal: controller.signal,
      }),
      client.request<Stats>("/applications/stats/", { signal: controller.signal }),
    ])
      .then(([page, summary]) => {
        if (!controller.signal.aborted) {
          setApplications(page);
          setStats(summary);
        }
      })
      .catch((e) => {
        if (
          !controller.signal.aborted &&
          !(e instanceof ApiError && e.code === "CANCELED")
        )
          setError(e);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    client,
    search,
    filters.page,
    filters.status,
    filters.work_mode,
    filters.ordering,
    overview,
    revision,
  ]);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  return { applications, stats, loading, error, refresh };
}
