# Verification report

Verified on 28 October 2026 using Linux, Java 17.0.20, Maven 3.9.9 and Node 24.22.1.

## Executed and passed

| Check | Result |
|---|---|
| Frontend dependency installation | Passed; lockfile included |
| Vite production build | Passed; React, motion and chart bundles split |
| npm dependency audit | 0 known vulnerabilities reported at verification time |
| Official Maven Wrapper | `./mvnw --version` successfully downloads/runs Maven 3.9.9 |
| Backend compilation and packaging | `mvn package` — BUILD SUCCESS |
| Automated backend suite | 8 tests, 0 failures, 0 errors, 0 skipped |
| Normal Kafka publication | Passed with real embedded KRaft broker |
| Exponential retries | Exactly 2000 ms, 4000 ms, STOP policy; actual third delivery succeeds |
| Retry timestamps | Recorded attempt gaps satisfy 1.9s and 3.9s lower bounds, allowing clock tolerance |
| Permanent failure and DLT | Three failed attempts; actual DLT listener records arrival |
| DLQ replay | Same event ID succeeds; lifetime attempt count becomes 4; completed replay rejected |
| Duplicate Kafka delivery | Two deliveries, one publication, one duplicate detection |
| Concurrent idempotency | Eight concurrent calls: one publication/attempt, seven duplicates |
| Scheduling logic | Future event not dispatched; Process Now creates a separate due ID |
| Event ID uniqueness | Conflicting creation rejected |
| Full browser demonstrations | Success, transient retry, DLQ + recovery, duplicate protection all passed |
| Browser scheduling form | Submitted through UI, automatically processed by running scheduler |
| Future scheduling via REST | Observed SCHEDULED before due time, then automatic SUCCESS |
| REST error behavior | Invalid request 400; missing event 404; completed replay 409 |
| Event inspection/search/CSV | Drawer opens; search narrows results; CSV download contains event fields |
| Desktop layout | All eight routes rendered at 1440px without page-level horizontal overflow |
| Mobile layout | All eight routes rendered at 390px without page-level horizontal overflow; menu navigation works |
| Browser runtime | No uncaught JavaScript exceptions during end-to-end checks |
| Visual review | Desktop and mobile overview screenshots inspected |
| Compose static check | YAML parses; host/internal listeners and KRaft quorum settings checked |

Browser tests used Chromium Headless Shell 134 through Playwright, the real React app, real Spring Boot HTTP endpoints, persistent entity transactions in an isolated in-memory H2 database, and a real embedded Kafka broker. No API response mocks or fabricated UI data were used. The normal application uses the configured file-backed H2 database and Docker Kafka.

The backend uses Spring Kafka's embedded KRaft broker for integration tests. `LocalVerificationServer` in test sources was used only for browser verification and is not part of the packaged application. Tests select Mockito's subclass mock maker because JVM agent attachment is unavailable in the verification sandbox; the reliability tests themselves use actual services and Kafka, not mocked publication outcomes.

Raw text evidence is included in `verification/`.

## Not executed here

- Docker is not installed in this environment, so `docker compose up` and `docker compose config` were not executed. The supplied Compose configuration was checked statically; the actual application flow was exercised with embedded Kafka.
- Windows-specific Docker Desktop setup and `mvnw.cmd` execution were not run on a Windows machine. The official wrapper's Unix counterpart was executed.
- Browser checks used Vite's development server; the production bundle was built successfully but was not separately subjected to the complete browser suite.
- File-store restart recovery, broker crash/restart fault injection, long-running soak tests and high-load production performance were not tested. Recovery semantics and limitations are documented in README.md.
- No external social platform was contacted. All business publications are deliberately simulated database records.

## Reproduce the backend suite

From `backend` on Windows: `.\mvnw.cmd test`. From Linux/macOS: `./mvnw test`.

The suite automatically starts its own broker and database and does not require Docker.
