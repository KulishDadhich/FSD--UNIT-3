# Upgrade verification — 30 October 2026

- Final Maven `clean verify`: BUILD SUCCESS.
- 21 backend test cases discovered: **19 passed, 2 Testcontainers cases skipped** because Docker is unavailable here. No failed tests.
- Backend coverage: **89.36% lines (361/404)**, against an enforced 80% aggregate line-coverage gate. No main-code exclusions.
- Frontend production build: passed.
- Pact JavaScript consumer test: passed using the frontend login request function.
- Pact provider verification: passed against a running Spring Boot application.
- Embedded Kafka reliability tests: passed for success, retries, DLT, replay, duplicate handling and scheduling.
- MockMvc/security tests: passed for API validation, JWT login, viewer/editor/admin permissions, team updates and analytics/history routes.
- Chromium browser smoke test: admin login, actual Kafka demo, Calendar, Team members, logout, viewer registration and viewer login passed with no uncaught JavaScript exceptions. Team page was visually inspected.
- Compose/workflow YAML parsing and Bash rollout script syntax: passed.

## Still requires execution in your environment

Docker image builds, PostgreSQL/Flyway and Kafka **Testcontainers** application tests, Docker Compose startup, GitHub Actions hosted runs, registry uploads, SSH rollout, traffic split, promotion and rollback have not been executed here. Their implementations are included. Windows startup-helper execution has not been tested on Windows. GitHub Actions explicitly enables Testcontainers and contract verification; failures block image release.

Cloud deployment requires the account/server/secrets described in START-HERE.md. The ZIP does not provision or deploy a server. Canary validation currently uses health probes, not statistical production telemetry. Public TLS, off-host backups and load/security testing remain operational work. Social media publication stays simulated. This is a shared single-organization application, not tenant-isolated SaaS.

Raw reports and a browsable coverage report are under verification/. Open verification/coverage-report/index.html. Original experiment documentation and its old evidence are under legacy-docs/; those historical checks must not be mistaken for new deployment verification.
