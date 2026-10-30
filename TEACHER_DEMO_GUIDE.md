# Demonstrate all six experiments

Start Docker Desktop and follow START-HERE.md. Log in as the administrator.

| Experiment | What to show | What to say |
|---|---|---|
| 3.1.1 | Create a post for a future time, then inspect the pipeline/history | “The scheduler waits until the due time. A producer sends an event to Kafka and a consumer processes it independently.” |
| 3.1.2 | Run retry, DLQ, and duplicate demonstrations | “Two increasing waits help recover temporary failures. Persistent failures go to a separate queue. A unique identifier prevents duplicate publications.” |
| 3.2.1 | Open a GitHub Actions CI run and its uploaded test reports | “Each code change is built and tested. Unit tests check small pieces; MockMvc checks API behavior; Pact checks frontend/backend agreement; Testcontainers starts real test infrastructure.” |
| 3.2.2 | Show image tags in GHCR and, after configuring a server, the release run | “Only tested commits create release images. A small portion of API traffic goes to a candidate version before promotion. Failed health checks restore the prior release.” |
| 3.3.1 | Log in, create a post, open Calendar, inspect History | “The user interface sends authenticated API requests. The backend stores data in PostgreSQL and returns real results.” |
| 3.3.2 | Register a viewer, show a denied write, promote to editor in Team members, show Swagger and coverage report | “Roles control access at the backend. We integrate all modules and enforce at least 80% backend line coverage.” |

Publishing remains simulated; Kafka and database processing are real. This project has one shared team workspace, so all registered members can see the same posts. Do not claim a GitHub or server deployment ran until you have configured and executed it. A workflow file is implementation evidence, while an actual successful run is execution evidence.

## Short presentation script

“EventFlow is our integrated social media scheduling and reliability project. React is the interface, Spring Boot is the backend, PostgreSQL stores records, and Kafka transports scheduled work. Docker starts all four services.

The first two experiments implement asynchronous processing and recover from failures through retries, dead-letter routing and duplicate protection. The next two automate testing and deployment with GitHub Actions and Docker images. The final two integrate login, roles, calendar, analytics and documentation into one application.

The test pipeline checks behavior and API contracts. A canary release introduces a new backend to a small share of API requests before replacing the old version. We preserve the original Kafka worker during that trial and replace it after promotion.”
