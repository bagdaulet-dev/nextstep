# Contributing

Nextstep keeps application data private to its owner. Changes should preserve that boundary and keep the setup understandable for someone learning backend development.

## Local setup

Follow the [README](README.md) to start the preview or MySQL stack. Use a feature branch and a focused pull request that explains the problem, resulting behavior and verification. Use fictional data in screenshots, fixtures and examples. Keep credentials and database exports out of commits.

## Checks before a pull request

```sh
APP_MODE=preview .venv/bin/pytest --cov --cov-fail-under=90
.venv/bin/ruff check backend scripts/setup-env.py
.venv/bin/ruff format --check backend scripts/setup-env.py
npm run format:check
npm run build
```

Run the [MySQL test profile](docs/operations.md#run-the-mysql-test-profile-locally) for database changes. With the preview running, run `npm run test:browser` and `npm run test:docs` for interface or API documentation changes. CI repeats these checks and builds the container.

Add tests for behavior changes, especially account ownership, validation, sessions and transactions. Include Django migrations for model changes. Describe API contract changes in [docs/api.md](docs/api.md); keep unknown and read-only fields rejected unless the contract changes deliberately.

## Dependency changes

Use exact versions and preserve `package-lock.json`. npm lifecycle scripts are disabled by project policy. Review any proposed exception before executing it. Run the native npm and Python dependency audits, and include upgrade compatibility notes when behavior changes.

## Reporting issues

For ordinary bugs, include reproduction steps, expected behavior, environment details and sanitized logs. Never include passwords, session cookies or real job-search notes. Report security issues privately using [SECURITY.md](SECURITY.md).
