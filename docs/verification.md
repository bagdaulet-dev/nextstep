# Verification record

Verified locally on **2026-10-27** using Python 3.12.14, Node 24.21.0, Chrome, Docker and MySQL 8.4.

| Check                                 | Result                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Preview database suite                | **79 passed**, 2 MySQL-only row-lock tests skipped                                                |
| Real MySQL suite                      | **81 passed**, including concurrent updates and capacity checks                                   |
| Backend line coverage                 | **93.26%**; configured minimum 90%                                                                |
| TypeScript and production Vite build  | Passed                                                                                            |
| Ruff lint and formatting              | Passed                                                                                            |
| Prettier                              | Passed                                                                                            |
| OpenAPI validation                    | Passed, no warnings                                                                               |
| Django production configuration check | Passed, no warnings                                                                               |
| Python runtime dependency audit       | No known vulnerabilities found                                                                    |
| npm dependency audit                  | 0 known vulnerabilities                                                                           |
| Docker build and Compose readiness    | Passed; database and application healthy                                                          |
| Container controls                    | Non-root, read-only filesystem, dropped capabilities; no database root password passed to app     |
| Browser journey, native preview       | Passed                                                                                            |
| Browser journey, Docker/MySQL         | Passed                                                                                            |
| Interactive API documentation         | 14 operations render; CSRF-protected demo write and authenticated session passed under strict CSP |

## API and privacy coverage

Tests cover password hashing/validation, email normalization, duplicate emails, session restoration/logout, anonymous and authenticated CSRF, foreign origins, account export/deletion, owner isolation on every object operation, private demo accounts, demo expiry/cleanup, bounded inputs, invalid URLs/dates, status history, search/filter/pagination, summary ownership, malformed/oversized JSON, generic service errors, cookie flags and login throttling.

MySQL-specific concurrent requests verify that status-event chains remain consistent and that two simultaneous creates cannot exceed the account’s 1,000-application limit. SQLite intentionally skips these checks because its locking behavior differs.

## Browser coverage

The browser journey creates a separate fictional demo workspace, adds an application, changes status, checks history, edits details, searches, reloads, cancels and confirms deletion, views insights and exports JSON. A second browser account starts empty and can delete its own account. The test checks browser errors and horizontal overflow at 320, 390 and 768 pixels; desktop screenshots use 1440 pixels. The journey passed on both SQLite preview and containerized MySQL.

The API docs test renders the locally served Swagger UI and executes a real CSRF-protected demo request. Its static initialization and styling require no inline-script/style exception to the Content Security Policy. The regular-motion preview’s pause control was checked separately; automated screenshot contexts request reduced motion.

Screenshots use fictional data:

- [Desktop overview](screenshots/overview-desktop.png)
- [Mobile overview](screenshots/overview-mobile.png)
- [Desktop insights](screenshots/insights-desktop.png)

## Limits of this record

Local verification is recorded above. GitHub verification results are available in the [CI workflow](https://github.com/bagdaulet-dev/nextstep/actions/workflows/ci.yml). Container publishing remains manual; no remote server deployment is configured. Dependency audit results reflect the advisories available at verification time; they do not prove the absence of vulnerabilities.

The final user-facing preview uses SQLite so Docker can remain stopped. The full MySQL stack was verified separately. Demo records are physically removed by the documented cleanup command/startup hook; ongoing cleanup requires scheduling.
