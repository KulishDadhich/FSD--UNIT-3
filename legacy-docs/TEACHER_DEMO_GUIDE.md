# EventFlow — a 3–5 minute classroom demonstration

## Before the teacher arrives

1. Start Docker Desktop, Kafka, Spring Boot and the React frontend as described in README.md.
2. Open http://localhost:5173 and wait for **Kafka Connected**.
3. Keep this guide available in another tab. Use browser zoom around 90–100% on a laptop.
4. Do one rehearsal. Existing history is fine: describe increases in counters instead of expecting all counters to start at zero.
5. Say clearly: **“Posting to social media is simulated. The message queue, retries, database and duplicate protection are real.”**

## 0:00–0:35 — introduce the idea

Open **Overview**.

Say: “EventFlow is like a reliable delivery service for scheduled social media posts. One part sends work, another part carries out the work. They communicate through Kafka, which holds messages until a worker receives them.”

Point out the six live counters and the connection indicator. Explain that an empty dashboard means no events have been created, not that results are being hidden.

## 0:35–1:10 — normal delivery (Experiment 3.1.1)

In **Interactive Demo Lab**, click **Successful event** once.

Say: “This creates a message, stores it, sends it through Kafka, and processes it. The browser waits for the backend result.”

Wait for SUCCESS and **Simulated Publication**. Expand the recorded timeline below the result. Point to one processing attempt.

Say: “Producer means sender; consumer means worker. They run independently.”

If desired, briefly open **Live pipeline**. Its logs show the actual event ID and timestamps. Very quick stages may already have completed; the history records them.

## 1:10–1:55 — recovery from a temporary failure (Experiment 3.1.2)

Open **Retry mechanism** and click **Simulate Temporary Failure**.

Say: “Imagine the publishing service is temporarily busy. We intentionally fail twice. The system waits two seconds, retries, then waits four seconds before the final attempt.”

Watch the countdown and history. Wait for attempt 3 to become SUCCESS.

Say: “This increasing delay is called exponential backoff. It gives a struggling service time to recover without repeatedly overwhelming it.”

## 1:55–2:50 — permanent failure and recovery

Open **Dead letter queue**, click **Simulate Permanent Failure**, and wait approximately 7–15 seconds.

Say: “Sometimes waiting does not fix the problem. After three failed attempts, the application sends the message into a special Kafka topic for inspection, called a dead letter queue.”

Wait for the failed event card to appear. Point out its error reason, attempts and arrival time.

Click **Correct & reprocess event**.

Say: “We correct the demonstration's failure condition and send the same event identifier through the real pipeline again.”

Open **History & analytics** and inspect that event. Wait for SUCCESS. Show its replay count, original three failures and final successful attempt. The event leaves the current DLQ list when replay begins.

## 2:50–3:35 — prevent duplicate work

Open **Idempotency**. Click **Send Duplicate Event**.

Say: “Networks sometimes deliver the same message more than once. We send exactly the same message twice on purpose.”

Wait for the duplicate count to increase and the timeline to show both SUCCESS and DUPLICATE.

Say: “The database checks a unique event identifier. The first delivery creates a publication; the second is recorded and skipped. This is called idempotency: repeating the request does not repeat its effect.”

## 3:35–4:25 — show real scheduling

Open **Scheduled posts**. Enter a title, content, platform, and a date/time about one minute ahead. Click **Schedule post**.

Say: “This stays scheduled until its real due time. The frontend cannot publish it early.”

Use **Process Now** on the card to demonstrate an immediately due **new** event without changing the original future event. Explain this distinction explicitly.

If you have time, wait for the original scheduled event to complete after its due time.

## 4:25–5:00 — connect it to the experiments

Open **System architecture**. Click Producer, Consumer, Retry policy and Dead letter queue to reveal their descriptions.

Say: “Experiment 3.1.1 is the asynchronous Kafka communication. Experiment 3.1.2 is making it reliable through retries, failure isolation, and duplicate protection. Every outcome we saw came from the backend database.”

Optional: use History search, open the inspection drawer, and export CSV as evidence of the recorded experiment.

## Simple vocabulary

| Word | Plain-English meaning |
|---|---|
| Event | A message saying that something needs to happen. |
| Producer | The sender of a message. |
| Kafka topic | A named, durable place where messages are stored. |
| Consumer | A worker that receives messages and does the job. |
| Asynchronous | The sender does not have to wait for the entire job to finish. |
| Retry | Try the same job again after a failure. |
| Exponential backoff | Wait longer between repeated attempts: here, 2 seconds then 4 seconds. |
| Dead letter queue | A separate place for messages that need inspection after repeated failure. |
| Idempotency | Repeated delivery does not produce repeated business results. |
| Event ID | A unique tracking number for one event. |

## If something goes wrong during the presentation

- Disconnected: check Docker and the Spring Boot terminal; the interface reconnects automatically.
- The countdown reaches zero before the next result: the next poll or consumer delivery may be slightly delayed. Wait for the recorded history rather than claiming completion.
- A demo is still pending: inspect the backend logs and health indicator. Do not click repeatedly; each click intentionally creates a new event.
- An event was already completed: replay is intentionally rejected to prevent double publication.
- Asked “Does this really publish on Instagram?”: answer **no**. The business result is simulated because external credentials are not supplied; the Kafka reliability mechanisms are real.
