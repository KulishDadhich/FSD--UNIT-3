import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  RotateCw,
  Archive,
  ShieldCheck,
  Play,
  ArrowRight,
  LoaderCircle,
} from "lucide-react";
import { post, errorText } from "../services/api";
import { useLive } from "../hooks/useLive";
import { Panel, Badge, Timeline, short } from "./UI";
import toast from "react-hot-toast";
const demos = [
  {
    key: "success",
    title: "Successful event",
    action: "Run Successful Event",
    icon: CheckCircle2,
    color: "green",
    text: "One message. One safe delivery.",
  },
  {
    key: "transient-failure",
    title: "Automatic retry",
    action: "Demonstrate Automatic Retry",
    icon: RotateCw,
    color: "amber",
    text: "Two failures. Automatic recovery.",
  },
  {
    key: "permanent-failure",
    title: "Dead letter queue",
    action: "Demonstrate Dead Letter Queue",
    icon: Archive,
    color: "purple",
    text: "Isolate a failure. Recover safely.",
  },
  {
    key: "duplicate",
    title: "Duplicate protection",
    action: "Demonstrate Duplicate Protection",
    icon: ShieldCheck,
    color: "cyan",
    text: "Two deliveries. One publication.",
  },
];
export function LiveResult({ id, scenario }) {
  const { data, error } = useLive("/events/" + id, 650),
    [now, setNow] = useState(Date.now()),
    announced = useRef(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);
  const e = data?.event,
    complete =
      e?.status === "DLQ" ||
      (e?.status === "SUCCESS" &&
        (scenario !== "duplicate" || e.duplicates > 0));
  const message =
    e?.status === "DLQ"
      ? "Repeated failure detected. The message was moved to the Dead Letter Queue."
      : e?.duplicates > 0
        ? "Duplicate detected. The system prevented the same action from happening twice."
        : e?.status === "SUCCESS"
          ? scenario === "transient-failure"
            ? "Temporary error detected. The system automatically retried and recovered."
            : "Success! Your message was safely delivered. Simulated Publication complete."
          : e?.status === "RETRYING"
            ? "A temporary error was recorded. Spring Kafka is waiting before the next attempt."
            : "Your event is saved. Waiting for the Kafka processing result…";
  useEffect(() => {
    if (complete && !announced.current) {
      announced.current = true;
      toast.success("Demonstration completed — see the recorded result.");
    }
  }, [complete]);
  const remaining = e?.nextRetryAt
    ? Math.max(0, (new Date(e.nextRetryAt).getTime() - now) / 1000)
    : 0;
  return (
    <div className="demo-result">
      <div className="flex justify-between flex-wrap gap-3">
        <div>
          <span className="eyebrow">LIVE RESULT · {short(id)}</span>
          <h3>{error ? "Connection interrupted — reconnecting" : message}</h3>
        </div>
        {e && <Badge status={e.status} />}
      </div>
      {!complete && (
        <div className="progress-track">
          <div />
        </div>
      )}
      {e?.status === "RETRYING" && (
        <div className="countdown">
          <RotateCw size={18} />
          <b>{remaining.toFixed(1)}s</b>
          <span>
            {remaining > 0
              ? "until next retry"
              : "Waiting for consumer delivery…"}
          </span>
        </div>
      )}
      <div className="result-facts">
        <span>
          Attempts <b>{e?.attempts ?? "—"}</b>
        </span>
        <span>
          Duplicates blocked <b>{e?.duplicates ?? "—"}</b>
        </span>
        <span>
          Event ID <code>{id}</code>
        </span>
      </div>
      <Timeline history={data?.history || []} />
    </div>
  );
}
export default function DemoLab({ only, heading = "Interactive Demo Lab" }) {
  const [run, setRun] = useState(null),
    [busy, setBusy] = useState(false);
  async function launch(key) {
    setBusy(true);
    try {
      const e = await post("/demo/" + key);
      setRun({ id: e.eventId, scenario: key });
      toast("Event accepted by the backend", { icon: "↗" });
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel
      title={heading}
      subtitle="Real Kafka. Real outcomes. Click a scenario to see reliability in action."
      action={<span className="tag">EXPERIMENTS 3.1.1 + 3.1.2</span>}
    >
      <div className={"demo-grid " + (only ? "single" : "")}>
        {demos
          .filter((d) => !only || d.key === only)
          .map((d) => (
            <button
              key={d.key}
              disabled={busy}
              aria-label={d.action}
              onClick={() => launch(d.key)}
              className={"demo-card " + d.color}
            >
              <span className="icon-box">
                <d.icon size={21} />
              </span>
              <h4>
                {only
                  ? {
                      "transient-failure": "Simulate Temporary Failure",
                      "permanent-failure": "Simulate Permanent Failure",
                      duplicate: "Send Duplicate Event",
                    }[d.key] || d.title
                  : d.title}
              </h4>
              <p>{d.text}</p>
              <span className="demo-action">
                {busy ? (
                  <LoaderCircle className="spin" size={14} />
                ) : (
                  <Play size={12} />
                )}{" "}
                Run demonstration <ArrowRight size={14} />
              </span>
            </button>
          ))}
      </div>
      {run && <LiveResult key={run.id} {...run} />}
    </Panel>
  );
}
