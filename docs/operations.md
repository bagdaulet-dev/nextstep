# Operations

## Configuration

Copying `.env.example` alone is insufficient: its passwords are placeholders. `python3 scripts/setup-env.py` creates a private `.env` with a unique secret key and two distinct database passwords. It never overwrites an existing file. Do not share this file or print its contents in logs.

| Variable                                       | Purpose                                                          |
| ---------------------------------------------- | ---------------------------------------------------------------- |
| APP_MODE                                       | `preview` or `mysql`                                             |
| DJANGO_DEBUG                                   | Explicit boolean; disable for hosting                            |
| DJANGO_SECRET_KEY                              | Unique secret; required outside debug, minimum 50 characters     |
| DJANGO_ALLOWED_HOSTS                           | Comma-separated hostnames, without schemes                       |
| DJANGO_CSRF_TRUSTED_ORIGINS                    | Optional exact trusted origins including scheme                  |
| DJANGO_SECURE_COOKIES                          | Defaults on outside debug; requires HTTPS                        |
| DJANGO_SSL_REDIRECT                            | Defaults on outside debug                                        |
| TRUST_PROXY                                    | False by default; enable only behind your controlled HTTPS proxy |
| DEMO_ENABLED                                   | Local fictional demo; forced off when debug is false             |
| API_DOCS_ENABLED                               | Defaults to debug value                                          |
| APP_TIME_ZONE                                  | Default `Asia/Almaty`; controls dates and activity weeks         |
| APP_PORT                                       | Local Compose application port, default 8002                     |
| MYSQL_DATABASE / USER / PASSWORD / HOST / PORT | Database connection; Compose sets host to `db`                   |
| MYSQL_ROOT_PASSWORD                            | MySQL initialization only; not the application account           |

Django reads `.env` through python-dotenv without overriding existing environment variables. Do not `source` the file as shell code. Preview commands explicitly set `APP_MODE=preview` so that a MySQL `.env` does not change their database.

## Run the MySQL test profile locally

Use the disposable test Compose file, which has an independent project name and no persistent data. Stop any earlier service using port 3310 first.

```sh
docker compose -f compose.test.yaml up -d --wait
APP_MODE=mysql MYSQL_HOST=127.0.0.1 MYSQL_PORT=3310 MYSQL_USER=root MYSQL_PASSWORD=nextstep-tests-only .venv/bin/pytest --cov
docker compose -f compose.test.yaml down
```

The root account and public password are for this disposable test database only, because pytest must create and drop `test_nextstep`. The application’s normal Compose service uses its dedicated MySQL user. The temporary test database is discarded when its container is removed.

## Cleanup

```sh
docker compose exec -T app python backend/manage.py purge_expired_data
```

Schedule this command hourly in the host’s scheduler for a continuously running installation. It deletes expired demo accounts and expired session rows. It leaves real accounts alone. The app also invokes it at startup; there is no in-process background worker.

## Public hosting

This repository includes a production-capable runtime, while the default `.env` and localhost Compose bindings are configured for development. Before hosting:

1. Use MySQL with a dedicated user, unique secrets and tested backups.
2. Set `DJANGO_DEBUG=false`, `DEMO_ENABLED=false`, `API_DOCS_ENABLED=false`.
3. Set your exact hostnames and HTTPS origins. Enable secure cookies and SSL redirect.
4. Terminate TLS in a controlled proxy. Set `TRUST_PROXY=true` only if that proxy strips untrusted forwarded headers and sets its own `X-Forwarded-Proto`.
5. Keep the database private. Configure edge request/body limits, health monitoring and cleanup scheduling.
6. Run `python backend/manage.py check --deploy --fail-level WARNING` in the target environment.
7. Review dependency updates, test the candidate image, take a backup and plan rollback before a release.

The image runs one Gunicorn process with two threads, keeping local resource use modest. Startup migrations suit this single-instance portfolio deployment. With multiple replicas, move migrations into one controlled release job. Health checks perform a database query and return no database credentials or details. Access logs are disabled in Gunicorn; configure metadata-only proxy logs without bodies, cookies or authorization values.

## CI and delivery

`ci.yml` verifies preview and MySQL behavior, browser interactions, OpenAPI, production settings, formatting, dependency audits and the Docker build. GitHub Actions are pinned to official release commit IDs. The latest run is visible in the repository’s Actions tab.

`publish-image.yml` is manual. It calls verification, then publishes commit-tagged and `latest` images to `ghcr.io/<owner>/<repository>` using the repository’s built-in token with package-write permission only for the publishing job. It contains no server credentials and performs no remote deployment.

A future deployment can pull the verified commit tag on a chosen host and run it behind HTTPS. No live host, domain or registry publication is configured or executed in this local build.

## Resource use and stopping

```sh
docker compose stop
```

This stops the app and database but retains data. Quit Docker Desktop when you no longer need its VM. The lightweight SQLite preview does not need Docker. Reopen Docker only when you want the MySQL stack or database tests.

## Common issues

- **Port 8002 already in use:** stop the existing preview, or use `APP_PORT=8003 docker compose up -d`.
- **Blank screen after a rebuild:** restart the Django preview to clear cached template references.
- **CSRF failure:** reload the page, sign in again, and use the returned token with cookies. Check trusted origins if developing on another hostname.
- **Secure cookies on plain HTTP:** use the local configuration for localhost; keep secure cookies on for public HTTPS hosting.
- **Database password changed but login fails:** MySQL initialization variables apply to a new data directory only. Rotate existing users explicitly; do not delete the volume just to change a password.
- **Demo data still on disk after a day:** run/schedule cleanup; session expiry and physical cleanup are separate operations.
