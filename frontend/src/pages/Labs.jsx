import { useState } from "react";
import {
  RotateCw,
  ShieldCheck,
  Archive,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Panel, Empty, Badge, time, short } from "../components/UI";
import { useLive } from "../hooks/useLive";
import { post, errorText } from "../services/api";
import DemoLab, { LiveResult } from "../components/DemoLab";
import toast from "react-hot-toast";
export function Retry() {
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">RELIABILITY LAB / 01</span>
        <h1>
          Automatic Recovery
          <br />
          <span>with Exponential Backoff</span>
        </h1>
        <p>
          Retries help the system recover from temporary failures without losing
          messages.
        </p>
      </div>
      <div className="concept-flow">
        <div>
          <span className="step-index">01</span>
          <b>Attempt 1</b>
          <Badge status="FAILED" />
        </div>
        <span className="wait">
          Wait 2 seconds <ArrowRight size={16} />
        </span>
        <div>
          <span className="step-index">02</span>
          <b>Attempt 2</b>
          <Badge status="FAILED" />
        </div>
        <span className="wait">
          Wait 4 seconds <ArrowRight size={16} />
        </span>
        <div>
          <span className="step-index">03</span>
          <b>Attempt 3</b>
          <Badge status="SUCCESS" />
        </div>
      </div>
      <p className="caption">
        Expected demonstration policy · the actual timeline appears below after
        you run it.
      </p>
      <DemoLab only="transient-failure" heading="Retry Mechanism Lab" />
      <div className="explanation-grid">
        <Panel title="Why wait between retries?">
          <p className="prose">
            A temporary problem needs time to recover. Doubling the delay
            reduces repeated pressure on a struggling service.
          </p>
        </Panel>
        <Panel title="What controls the retries?">
          <p className="prose">
            Spring Kafka’s error handler retries the message. The browser only
            reads the recorded attempts and displays the next retry time.
          </p>
        </Panel>
      </div>
    </>
  );
}
export function Dlq() {
  const { data: list } = useLive("/dlq"),
    [busy, setBusy] = useState(null),
    [replayId, setReplayId] = useState(null);
  async function replay(id) {
    setBusy(id);
    try {
      await post("/dlq/" + id + "/reprocess");
      setReplayId(id);
      toast.success(
        "Failure corrected. Same event ID returned to the Kafka flow.",
      );
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">RELIABILITY LAB / 02</span>
        <h1>
          Dead Letter Queue
          <br />
          <span>Failure Recovery Center</span>
        </h1>
        <p>
          Inspect failed messages, correct the cause, and send them safely
          through the pipeline again.
        </p>
      </div>
      <div className="info-banner">
        <Archive size={28} />
        <div>
          <b>{list?.length ?? "—"} messages awaiting recovery</b>
          <p>
            After retries are exhausted, the application sends the message to a
            separate Kafka topic for inspection.
          </p>
        </div>
        <span className="tag">scheduled-posts-dlt</span>
      </div>
      <DemoLab
        only="permanent-failure"
        heading="Demonstrate failure isolation"
      />
      {replayId && (
        <Panel
          title="Recovery in progress"
          subtitle="Live replay result · original event identifier preserved"
        >
          <LiveResult key={replayId} id={replayId} scenario="success" />
        </Panel>
      )}
      <Panel
        title="Messages in the dead letter queue"
        subtitle="Original topic → 3 delivery attempts → confirmed DLQ arrival"
      >
        {!list?.length ? (
          <Empty
            title="No unresolved failures"
            text="Run the permanent failure demonstration to inspect and recover a message here."
          />
        ) : (
          <div className="dlq-grid">
            {list.map((e) => (
              <article className="dlq-card" key={e.eventId}>
                <div className="flex justify-between">
                  <code>{short(e.eventId)}</code>
                  <Badge status="DLQ" />
                </div>
                <h3>{e.title}</h3>
                <p>{e.errorDetails}</p>
                <dl>
                  <div>
                    <dt>Original topic</dt>
                    <dd>{e.topic}</dd>
                  </div>
                  <div>
                    <dt>Attempts / replays</dt>
                    <dd>
                      {e.attempts} / {e.replays}
                    </dd>
                  </div>
                  <div>
                    <dt>Arrived at</dt>
                    <dd>{time(e.dlqAt)}</dd>
                  </div>
                </dl>
                <button
                  className="button primary"
                  disabled={busy === e.eventId}
                  onClick={() => replay(e.eventId)}
                >
                  <RotateCw size={15} />
                  Correct & reprocess event
                </button>
                <small>
                  Sets failure mode to NORMAL; preserves the event ID.
                </small>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
export function Idempotency() {
  const { data: s } = useLive("/dashboard/stats"),
    { data: logs } = useLive("/events/activity");
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">RELIABILITY LAB / 03</span>
        <h1>
          Duplicate Protection
          <br />
          <span>Process Once, Stay Consistent</span>
        </h1>
        <p>
          Idempotency ensures that processing the same message multiple times
          does not create duplicate results.
        </p>
      </div>
      <div className="protection-banner">
        <div className="shield-art">
          <ShieldCheck size={65} />
        </div>
        <div>
          <span className="eyebrow">PERSISTENT DATABASE PROTECTION</span>
          <h2>{s?.duplicates ?? "—"} duplicates prevented</h2>
          <p>
            Event row lock + unique publication ID + one database transaction.
          </p>
        </div>
      </div>
      <DemoLab only="duplicate" heading="Idempotency Protection Lab" />
      <Panel
        title="Duplicate detection history"
        subtitle="Recorded deliveries that did not create another publication"
      >
        {!logs?.some((l) => l.stage === "DUPLICATE") ? (
          <Empty title="No duplicate deliveries detected yet" />
        ) : (
          <div className="duplicate-list">
            {logs
              .filter((l) => l.stage === "DUPLICATE")
              .map((l) => (
                <div key={l.id}>
                  <ShieldCheck className="text-cyan" />
                  <div>
                    <b>{l.eventId}</b>
                    <p>{l.message}</p>
                    <small>{time(l.timestamp)}</small>
                  </div>
                  <Badge status="DUPLICATE" />
                </div>
              ))}
          </div>
        )}
      </Panel>
    </>
  );
}
