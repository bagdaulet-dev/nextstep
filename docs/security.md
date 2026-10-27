# Security model and limits

This document describes implemented controls and their limits. It is not a statement that every attack or legal requirement has been covered.

## Account isolation

All application reads, updates, deletion, history, search, totals, follow-ups and exports are scoped to the authenticated account. UUIDs make identifiers less predictable; authorization comes from the owner filter. Submitted owner, privilege and read-only fields are rejected. Automated tests exercise cross-account access to each object operation and account summaries/exports.

Passwords use Argon2 hashing with Django validators. The backend keeps sessions in the database. Session and CSRF cookies are HttpOnly and SameSite=Lax. HTTPS cookie flags, redirects and HSTS default on when debug is disabled. Registration, login and demo creation explicitly require CSRF protection even before authentication; authenticated mutations use session CSRF checks. The app rotates the CSRF token when authentication changes.

There is no password-reset email, address verification, MFA, social login or administrator interface in this project. Use a unique password. These features would be separate work before a broader public service.

## Input and browser controls

- JSON object bodies only, with a 64 KB boundary before parsing.
- Bounded text, date ranges, enums and pagination; unknown fields rejected.
- ORM queries with bound values; no string-built SQL for user input.
- Notes rendered as React text, with no HTML injection or rich-text rendering.
- HTTP/HTTPS job links only; credentials in URLs rejected. Links are opened by the browser; the backend never fetches them.
- Same-origin requests, strict Content Security Policy, denied framing, nosniff, limited browser permissions and no API response caching.
- No API keys in the frontend, auth tokens in localStorage, third-party analytics, remote fonts or external logo requests.
- Unexpected API errors return generic messages. Application logs omit request bodies, passwords and application notes. Proxy/platform logs need separate configuration.

The container runs as a non-root user with a read-only filesystem, temporary writable directories, dropped capabilities and no added privileges. Compose exposes only localhost; MySQL has no published port in the normal configuration. The app uses the dedicated MySQL account, not root.

## Rate limits

DRF throttles are cache-based and approximate. Preview cache state is process-local; full MySQL mode shares cache state between processes. Cache operations are not an atomic distributed limiter, and eviction/restarts can reset limits. Use a reverse proxy or gateway for reliable public rate limits and monitor resource usage. Default limits are documented in the API reference.

## Retention and deletion

| Data                  | Behavior                                                                      |
| --------------------- | ----------------------------------------------------------------------------- |
| Normal applications   | Retained until the owner deletes the record/account                           |
| Status history        | Latest 100 events per application                                             |
| Normal sessions       | Seven-day expiry; expired rows removed by cleanup                             |
| Demo sessions         | At most 24 hours; expired demo accounts cannot authenticate                   |
| Demo database records | Removed by `purge_expired_data` after 24 hours                                |
| Throttle cache        | Short-lived entries; database cache also culls when over its configured bound |

Cleanup runs at container/preview startup. **Continuous cleanup needs an operator-scheduled command**, such as an hourly cron job; the app does not run a hidden background scheduler. Expiry prevents access even when cleanup has not yet run. A stopped app’s demo records remain on disk until cleanup or explicit deletion.

Account deletion cascades to owned applications/history and invalidates the current session. Other old session rows can remain until expiry cleanup, but cannot authenticate a deleted user. Backups and infrastructure logs have their own retention, controlled by the operator. Export includes the profile and retained application history, without password hashes or session secrets.

## Public hosting checklist

Use MySQL, disable debug/demo/documentation unless intentionally enabled, generate unique secrets, enable HTTPS cookies/redirects, restrict allowed hosts/CSRF origins, trust forwarded headers only from a controlled proxy, schedule cleanup, add backups and restore tests, monitor failures, and set edge request limits. Keep dependencies and container bases updated.

Never commit `.env`, `.local`, database files or exports containing real personal data. The environment setup script writes `.env` once with mode 0600; repository ignore rules exclude local secrets and records. Verify the staged changes before any future publication.
