export type Status = "APPLIED" | "INTERVIEW" | "OFFER" | "REJECTED";
export type WorkMode = "REMOTE" | "HYBRID" | "ONSITE";
export type View = "overview" | "applications" | "insights";
export type User = { id: string; name: string; email: string; is_demo: boolean };
export type Session = {
  user: User | null;
  csrf_token: string;
  demo_enabled: boolean;
  mode: string;
};
export type Application = {
  id: string;
  company: string;
  position: string;
  location: string;
  work_mode: WorkMode;
  job_url: string;
  status: Status;
  notes: string;
  applied_date: string;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
};
export type ApplicationInput = Omit<Application, "id" | "created_at" | "updated_at">;
export type StatusEvent = {
  id: string;
  from_status: Status | "";
  to_status: Status;
  created_at: string;
};
export type Page<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
export type Stats = {
  total: number;
  active: number;
  applied_this_week: number;
  by_status: Record<Status, number>;
  activity: { week: string; count: number }[];
  follow_ups: Application[];
};
export type Filters = {
  search: string;
  status: Status | "";
  work_mode: WorkMode | "";
  ordering: "newest" | "oldest" | "company";
  page: number;
};
export const statuses: Status[] = ["APPLIED", "INTERVIEW", "OFFER", "REJECTED"];
export const statusLabels: Record<Status, string> = {
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
};
export const modeLabels: Record<WorkMode, string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "On-site",
};
