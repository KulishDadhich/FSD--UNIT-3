import { Link } from "react-router-dom";
import {
  Zap,
  CheckCircle2,
  RotateCw,
  TriangleAlert,
  Archive,
  ShieldCheck,
  ArrowRight,
  Activity,
  Radio,
  Database,
  Server,
} from "lucide-react";
import { useLive } from "../hooks/useLive";
import {
  Panel,
  Metric,
  Empty,
  Skeleton,
  time,
  short,
  Badge,
} from "../components/UI";
import { Throughput, Outcomes } from "../components/Charts";
import EventTable from "../components/EventTable";
import DemoLab from "../components/DemoLab";
export default function Overview({ health }) {
  const { data: s, loading, error } = useLive("/dashboard/stats"),
    { data: a } = useLive("/analytics"),
    { data: logs } = useLive("/events/activity");
  const metrics = [
    ["Total Events", "total", Zap, "purple", "All scheduled messages"],
    [
      "Successfully Processed",
      "success",
      CheckCircle2,
      "green",
      "Simulated publications",
    ],
    ["Retry Attempts", "retries", RotateCw, "amber", "Additional deliveries"],
    ["Failed Events", "failed", TriangleAlert, "red", "Failed or in DLQ"],
    ["DLQ Messages", "dlq", Archive, "purple", "Awaiting recovery"],
    [
      "Duplicates Prevented",
      "duplicates",
      ShieldCheck,
      "cyan",
      "Protected operations",
    ],
  ];
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">
            <span className="tiny-dot" /> YOUR RELIABILITY CONTROL CENTER
          </span>
          <h1>
            Reliable events.
            <br />
            <span>Seamless delivery.</span>
          </h1>
          <p>
            Every message has a journey. Make every journey count.
            <br />
            Schedule, observe, and recover—all in one workspace.
          </p>
          <Link className="button primary" to="/posts">
            <Zap size={16} />
            Schedule a post <ArrowRight size={16} />
          </Link>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <span className="orbit-node n1">
            <Database />
          </span>
          <span className="orbit-node n2">
            <ShieldCheck />
          </span>
          <span className="orbit-node n3">
            <Radio />
          </span>
          <div className="orb-core">
            <Zap size={45} />
          </div>
          <span className="orbit-caption">BUILT FOR RESILIENCE</span>
        </div>
      </section>
      {loading ? (
        <Skeleton />
      ) : (
        <div className="metrics">
          {metrics.map(([label, key, icon, color, hint]) => (
            <Metric
              key={key}
              {...{ label, icon, color, hint }}
              value={error ? "—" : s?.[key]}
            />
          ))}
        </div>
      )}
      <div className="overview-charts">
        <Panel
          title="Event throughput"
          subtitle="Successful publications and DLQ arrivals · last 12 minutes"
          action={
            <span className="live-label">
              <i />
              LIVE
            </span>
          }
        >
          <Throughput data={a?.series} />
          <div className="chart-key">
            <span>
              <i className="purple-dot" />
              Successful publications
            </span>
            <span>
              <i className="red-dot" />
              DLQ arrivals
            </span>
          </div>
        </Panel>
        <Panel title="Delivery outcomes" subtitle="Current state of all events">
          <Outcomes stats={s} />
        </Panel>
      </div>
      <DemoLab />
      <div className="lower-grid">
        <Panel
          title="Recent events"
          subtitle="A clear view of your latest messages"
          action={
            <Link className="text-link" to="/history">
              View all <ArrowRight size={14} />
            </Link>
          }
        >
          <EventTable compact />
        </Panel>
        <Panel
          title="Live activity"
          subtitle="Recorded directly by the backend"
          action={<Activity size={17} className="muted" />}
        >
          {!logs?.length ? (
            <Empty
              title="Quiet, for now"
              text="Live activity appears here when an event begins its journey."
            />
          ) : (
            <div className="activity-feed">
              {logs.slice(0, 6).map((l) => (
                <div key={l.id}>
                  <span className={"feed-dot " + l.stage.toLowerCase()} />
                  <div>
                    <b>{l.stage.replaceAll("_", " ")}</b>
                    <p>{l.message}</p>
                    <small>
                      {short(l.eventId)} · {time(l.timestamp)}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
      <div className="health-strip">
        {[
          [Server, "Spring Boot API", health?.api],
          [Radio, "Kafka broker", health?.kafka],
          [Database, "Persistent database", health?.database],
        ].map(([Icon, label, up]) => (
          <span key={label}>
            <Icon size={16} />
            {label}
            <b className={up ? "text-green" : "muted"}>
              {up ? "Operational" : "Unavailable"}
            </b>
          </span>
        ))}
        <span className="muted">Polling live data · no synthetic metrics</span>
      </div>
    </>
  );
}
