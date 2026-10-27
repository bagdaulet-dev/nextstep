# Security policy

Security fixes target the current `main` branch. Older snapshots do not have a separate support policy.

## Report a vulnerability

Use GitHub’s private reporting option on the repository’s **Security → Advisories → Report a vulnerability** page:

https://github.com/bagdaulet-dev/nextstep/security/advisories/new

Include the affected endpoint or component, reproduction steps with fictional data, and the expected security impact. Do not post exploitable details in a public issue or include credentials, cookies, personal data or real exports.

This is an individually maintained portfolio project, so no guaranteed response time is promised. Coordinate disclosure after the issue has been assessed and a fix is available.

## Implemented controls and limitations

See [docs/security.md](docs/security.md) for account isolation, CSRF, password hashing, cookie flags, input limits, data retention and deployment requirements. Passing automated checks or a dependency audit does not establish that the app is vulnerability-free.
