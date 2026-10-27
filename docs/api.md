# Nextstep REST API

Base path: `/api/`. Routes use trailing slashes. Request and response bodies use JSON. Protected endpoints require a logged-in cookie session.

In local development, interactive documentation is available at **http://localhost:8002/api/docs/** and the OpenAPI schema at `/api/schema/`. These are developer tools for trying requests; they do not bypass authentication. Documentation is disabled by default when debug mode is off.

## Authentication flow

1. `GET /api/auth/session/` receives a CSRF cookie and returns a masked `csrf_token`.
2. `POST /api/auth/register/` or `/api/auth/login/` sends JSON plus `X-CSRFToken` and includes cookies.
3. A successful response returns the user and a fresh CSRF token. Keep this token in memory for later writes.
4. Every `POST`, `PATCH` and `DELETE` uses the current token and session cookie. No bearer API key is required.

```js
const initial = await fetch("/api/auth/session/").then((r) => r.json());
const response = await fetch("/api/auth/login/", {
  method: "POST",
  credentials: "same-origin",
  headers: { "Content-Type": "application/json", "X-CSRFToken": initial.csrf_token },
  body: JSON.stringify({ email: "you@example.com", password: "your-password" }),
});
const session = await response.json();
// On success, use session.csrf_token for subsequent writes.
```

## Endpoints

| Method | Path                            | Behavior                                                           |
| ------ | ------------------------------- | ------------------------------------------------------------------ |
| GET    | `/health/`                      | Database readiness; returns `status: ok` or 503                    |
| GET    | `/auth/session/`                | Current user or null, CSRF token, mode and demo availability       |
| POST   | `/auth/register/`               | Create account and sign in; 201                                    |
| POST   | `/auth/login/`                  | Sign in with email and password                                    |
| POST   | `/auth/logout/`                 | Invalidate the current session                                     |
| POST   | `/auth/demo/`                   | Create a private fictional demo, when enabled locally              |
| GET    | `/auth/export/`                 | Export owned user profile, applications and retained history       |
| POST   | `/auth/delete/`                 | Delete account with `confirmation: DELETE` and current password    |
| GET    | `/applications/`                | Owned application list, paginated                                  |
| POST   | `/applications/`                | Create an owned application; 201                                   |
| GET    | `/applications/{uuid}/`         | Read one owned application                                         |
| PATCH  | `/applications/{uuid}/`         | Update selected fields and record status changes                   |
| DELETE | `/applications/{uuid}/`         | Delete application and history; 204                                |
| GET    | `/applications/{uuid}/history/` | Latest 100 status events, newest first                             |
| GET    | `/applications/stats/`          | Owned totals, status counts, eight activity weeks, four follow-ups |

Registration body: `name` (1–80), `email` (valid, max 254), `password` (10–128). Passwords also pass Django’s similarity, common-password and numeric-password checks. Emails are normalized to lowercase. Login errors use the same message for unknown email and wrong password.

## Application fields

| Field          | Rules                                                             |
| -------------- | ----------------------------------------------------------------- |
| company        | Required text, max 120                                            |
| position       | Required text, max 160                                            |
| location       | Optional text, max 120                                            |
| work_mode      | `REMOTE` (default), `HYBRID`, `ONSITE`                            |
| job_url        | Optional HTTP/HTTPS URL, max 2,048, no embedded credentials       |
| status         | `APPLIED` (default), `INTERVIEW`, `OFFER`, `REJECTED`             |
| notes          | Optional text, max 4,000; multiline allowed                       |
| applied_date   | ISO date, default today in the configured app timezone; 2000–2099 |
| follow_up_date | ISO date or null; on/after applied date, through 2099             |

`id`, `created_at` and `updated_at` are read-only. `owner` is never accepted from the client or included in application responses. Unknown fields and submitted read-only fields are rejected. Each account can hold up to 1,000 applications.

```json
{
  "company": "Northstar Labs",
  "position": "Python Backend Engineer",
  "location": "Almaty",
  "work_mode": "HYBRID",
  "status": "APPLIED",
  "applied_date": "2026-10-27",
  "follow_up_date": "2026-11-03",
  "notes": "Ask about the backend team."
}
```

## List queries

`search` matches company or position, case-insensitively, max 100 characters. `status` and `work_mode` accept the enums above. `ordering` is `newest` (default), `oldest`, or `company`. `page` is 1–10,000; `page_size` is 1–50, default 20. Unknown query keys are rejected.

```text
/api/applications/?search=python&status=INTERVIEW&ordering=newest&page=1&page_size=20
```

Responses have `count`, `next`, `previous` and `results`. UUID tie-breakers make ordering stable. Requests for nonexistent pages return 404. An existing record belonging to someone else also returns 404.

## Errors and limits

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Check the highlighted fields and try again.",
    "fields": { "company": ["This field is required."] }
  }
}
```

Common statuses: 400 invalid input, 403 not authenticated or CSRF failure, 404 missing/not owned, 413 body over 64 KB, 415 unsupported content type, 429 throttled, 503 service unavailable. Cookie-session authentication uses **403**, including anonymous access to private endpoints.

The default throttle targets are 300 requests/minute per signed-in user, 60/minute per anonymous IP, 10/minute on registration/login and 12/hour on demo creation. DRF’s cache throttles are approximate, not an atomic abuse-prevention boundary. Use edge limits for public hosting.
