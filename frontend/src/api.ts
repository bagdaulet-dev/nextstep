export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public fields: Record<string, string[]> = {},
    public status = 0,
  ) {
    super(message);
  }
}
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export class ApiClient {
  csrf = "";
  onExpired: (() => void) | undefined;
  async request<T>(
    path: string,
    options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
  ): Promise<T> {
    const method = options.method || "GET";
    const headers: Record<string, string> = { Accept: "application/json" };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    if (!["GET", "HEAD"].includes(method)) headers["X-CSRFToken"] = this.csrf;
    const timeout = AbortSignal.timeout(15000);
    let response: Response;
    try {
      response = await fetch(`/api${path}`, {
        method,
        credentials: "same-origin",
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
      });
    } catch {
      if (options.signal?.aborted) throw new ApiError("CANCELED", "Request canceled.");
      throw new ApiError(
        "CONNECTION_ERROR",
        timeout.aborted
          ? "This is taking too long. Refresh before retrying a change."
          : "Cannot connect to Nextstep. Check that the app is running, then try again.",
      );
    }
    if (response.status === 204) return undefined as T;
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = object(data) && object(data.error) ? data.error : {};
      const code = typeof error.code === "string" ? error.code : "REQUEST_FAILED";
      const message =
        typeof error.message === "string"
          ? error.message
          : "This request could not be completed. Try again.";
      const fields: Record<string, string[]> = {};
      if (object(error.fields))
        for (const [key, value] of Object.entries(error.fields))
          fields[key] = Array.isArray(value)
            ? value.filter((v): v is string => typeof v === "string")
            : [String(value)];
      if (code === "NOT_AUTHENTICATED") this.onExpired?.();
      throw new ApiError(code, message, fields, response.status);
    }
    return data as T;
  }
}
