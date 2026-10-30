# EventFlow capstone — start here

This upgrade preserves experiments 3.1.1/3.1.2 and adds the source/configuration for 3.2.1, 3.2.2, 3.3.1 and 3.3.2. Read VERIFICATION.md for executed checks and infrastructure checks still awaiting Docker/server access.

## Optional Windows startup helper

After starting Docker Desktop, right-click the project folder in VS Code and open its terminal. Run `powershell -ExecutionPolicy Bypass -File .\Start-EventFlow.ps1`. This process-scoped command runs the included helper, asks for an admin email, generates random secrets when `.env` is missing, and builds/starts all services. Save the printed administrator password. Existing `.env` files are preserved. The script has not been executed on Windows in this environment.

## Windows: manual startup of all four services

1. Extract this ZIP to a **new folder**. Do not overwrite your old H2 database or old source folder.
2. Open the folder containing `docker-compose.yml` in VS Code. Start Docker Desktop using Linux containers.
3. Stop your previous frontend and backend terminals with Ctrl+C. Stop the old Kafka Compose stack with `docker compose down` from the old project folder (do not add `-v`).
4. In the new project folder:

```powershell
Copy-Item .env.example .env
notepad .env
```

Replace the sample database password, JWT secret (at least 32 characters), admin email and admin password (at least 12 characters). Do not commit `.env`.

```powershell
docker compose up --build -d
docker compose ps
docker compose logs -f backend
```

Wait for `Started EventFlowApplication`, then open http://localhost:5173. Sign in using the administrator email/password you put in `.env`. First builds download dependencies and can take several minutes.

Docker now runs **PostgreSQL, Kafka, Spring Boot and the frontend**. PostgreSQL replaces the old file-based H2 runtime in this mode, avoiding file-lock conflicts between backend processes. The original Windows H2 startup failure was not diagnosed from a complete log; this upgrade does not claim its exact cause was established.

Swagger: http://localhost:8080/swagger-ui/index.html. Login through `/api/auth/login`, copy `data.token`, and use Swagger's Authorize button. Health: http://localhost:8080/actuator/health.

Stop: `docker compose down`. Data remains in named volumes. Do not run `down -v` unless you intentionally want to delete database and Kafka history. The new PostgreSQL store starts empty; the old H2 history is not automatically migrated.

## Login and collaboration

This is **one shared organization**, not a multi-tenant SaaS. All registered users belong to that organization and can read its posts and analytics. Registration grants VIEWER access. Use Team members as the administrator to grant EDITOR or VIEWER roles. The bootstrap administrator cannot be demoted through this screen.

| Role | Read posts/history/calendar | Create posts / demos / replay | Manage users |
|---|---|---|---|
| VIEWER | Yes | No | No |
| EDITOR | Yes | Yes | No |
| ADMIN | Yes | Yes | Yes |

Passwords use BCrypt hashes. Signed JWTs expire after 30 minutes; roles are looked up in the database on every request so permission changes take effect immediately. Redux Toolkit stores the token in memory; a page reload requires signing in again. There is no refresh-token service, password reset or per-device token revocation. The server enforces permissions even when a button is visible to a viewer.

Calendar groups real scheduled posts by local date; the month selector changes the visible period. Create posts through Scheduled posts. The existing retry, DLQ, duplicate and analytics pages continue to use backend records. Publication remains explicitly simulated; there are no social platform credentials, likes or engagement analytics.

## Experiment mapping and demonstration

- **3.1.1:** schedule a post; observe producer → Kafka → consumer → stored result.
- **3.1.2:** run transient, permanent and duplicate demos; recover the DLQ event.
- **3.2.1:** run JUnit unit tests, MockMvc API/security tests, embedded Kafka reliability tests, Pact consumer/provider verification and Testcontainers infrastructure tests. Push to GitHub to run the CI workflow.
- **3.2.2:** build the full application with Docker, publish immutable commit-tagged images to GHCR, then use the server rollout workflow for a 90/10 backend canary, health checks, promotion or rollback.
- **3.3.1:** sign in, compose and schedule a post, find it in Calendar, and inspect its analytics/history. Show invalid-input and unauthorized-request handling.
- **3.3.2:** register a viewer, demonstrate a blocked write, change the role to editor and demonstrate an allowed write. Show Swagger, PostgreSQL migration, the coverage report and CI/CD configuration.

## Tests

From `frontend`:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run test:contract
```

This produces `frontend/pacts/EventFlowReact-EventFlowApi.json` using the real frontend login client against a Pact mock server. Provider verification then runs that generated contract against a real Spring Boot server.

From `backend`:

```powershell
$env:RUN_CONTRACTS='true'
$env:RUN_CONTAINERS='true'
.\mvnw.cmd clean verify
```

Docker must be running for Testcontainers. The temporary containers are independent from the application containers. Do not set `RUN_CONTAINERS` if Docker is unavailable; that suite will be marked skipped. `RUN_CONTRACTS` requires generating the pact first. CI enables both explicitly.

JaCoCo enforces at least **80% aggregate backend line coverage** across all compiled main classes, with no exclusions. Report: `backend/target/site/jacoco/index.html`. This threshold is not frontend coverage and does not mean every branch or production failure case is tested.

## CI and image releases

Push the complete source, including `.github/`, to your GitHub repository. CI runs on pushes and pull requests, builds React, generates the Pact, verifies Java/tests/contracts, runs Testcontainers and checks coverage. Test reports are uploaded as artifacts.

After successful CI for a push to `main`, `release.yml` builds backend and frontend images and pushes them to:

- `ghcr.io/OWNER/REPOSITORY-backend:COMMIT_SHA`
- `ghcr.io/OWNER/REPOSITORY-frontend:COMMIT_SHA`

`GITHUB_TOKEN` is used to publish packages. On the deployment host, use `docker login ghcr.io` with a token having read access if packages are private. Make repository names lowercase in IMAGE_BASE.

## Actual server deployment and canary

Requires your Linux server with Docker Compose, Git, SSH access, sufficient memory for two Java processes plus Kafka/PostgreSQL, and access to GHCR. These external resources are not created by the ZIP.

Clone the repository into `/opt/eventflow`. Copy `deploy/.env.example` to `deploy/.env`, set the real secrets and IMAGE_BASE. Use shell-safe values or single-quote values when the file is sourced by Bash. Keep this file private. The deployment gateway binds to loopback port 8088; put an HTTPS reverse proxy in front of it for public access and set FRONTEND_ORIGIN to that exact HTTPS origin. Never expose Kafka or PostgreSQL publicly.

Set these GitHub production environment secrets:

- `DEPLOY_HOST`: server hostname
- `DEPLOY_USER`: SSH user allowed to run Docker
- `DEPLOY_SSH_KEY`: private SSH key
- `DEPLOY_KNOWN_HOSTS`: verified SSH host-key line

Set repository variable `DEPLOY_ENABLED=true`. Configure the production environment's approvals according to your course requirements; required approvals make this continuous delivery rather than unattended continuous deployment.

The deployment job checks out the exact tested commit on the server and calls `deploy/rollout.sh`. It starts a candidate backend with both scheduler and Kafka listeners disabled. A reverse proxy sends approximately 10% of API requests to the candidate and 90% to stable. Both share PostgreSQL. The old backend continues processing Kafka events during the canary window. After health probes pass, stable API/worker and frontend images are updated, traffic returns to stable, and the candidate is stopped. Thus HTTP canary weights are not incorrectly claimed to control Kafka consumers.

The first deployment has no previous version and therefore cannot meaningfully compare versions. Later deployments use `.stable-tag` to remember the previous image. On failed checks, the script restores the old images and routing. Keep database changes backward compatible: rollback does not undo database migrations. This is a smoke-tested canary design, not statistically validated traffic/error-rate analysis or a zero-downtime guarantee. Docker/SSH deployment must be validated on your server before presenting it as executed.

## Operational scope

Flyway initializes PostgreSQL schema and indexes; Hibernate validates it. Keep migrations additive during canary releases. Persistent volumes retain data, but off-host backups, restore drills, TLS setup, rate limiting, email verification, abuse controls, load/soak tests, observability alerts and high availability remain deployment responsibilities. Do not describe this teaching build as audited production software.

The old documentation is retained under `legacy-docs/` for the original reliability experiments. Use this guide for current startup and security instructions.
