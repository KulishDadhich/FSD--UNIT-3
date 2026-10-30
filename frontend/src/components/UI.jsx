import { motion } from "framer-motion";
import {
  Inbox,
  ArrowUpRight,
  X,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
export const time = (v) =>
  v
    ? new Date(v).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";
export const short = (v) => v?.slice(0, 8) || "—";
export function Badge({ status }) {
  return (
    <span className={"badge " + status?.toLowerCase()}>
      <i />
      {status?.replaceAll("_", " ") || "UNKNOWN"}
    </span>
  );
}
export function Empty({
  title = "No events yet",
  text = "Run a demonstration or schedule your first post to bring this workspace to life.",
}) {
  return (
    <div className="empty">
      <span>
        <Inbox size={25} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function Skeleton() {
  return (
    <div className="skeleton-grid">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}
export function Panel({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={"panel " + className}>
      <div className="panel-heading">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Metric({ label, value, icon: Icon, color = "purple", hint }) {
  return (
    <motion.div layout className={"metric " + color}>
      <div className="metric-top">
        <span className="icon-box">
          <Icon size={18} />
        </span>
        <ArrowUpRight size={15} />
      </div>
      <motion.strong
        key={value}
        initial={{ opacity: 0.4, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {value ?? "—"}
      </motion.strong>
      <span>{label}</span>
      <small>{hint}</small>
    </motion.div>
  );
}
export function Drawer({ detail, onClose }) {
  return (
    <div className="drawer-shade" onClick={onClose}>
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label="Event inspection"
        initial={{ x: 450 }}
        animate={{ x: 0 }}
        className="drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <span className="eyebrow">EVENT INSPECTION</span>
          <button
            className="icon-button"
            aria-label="Close inspection"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        <h2>{detail.event.title}</h2>
        <Badge status={detail.event.status} />
        <dl>
          {Object.entries(detail.event)
            .filter(([key]) => !["version", "content", "title"].includes(key))
            .map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v === null ? "—" : String(v)}</dd>
              </div>
            ))}
        </dl>
        <p className="content-preview">{detail.event.content}</p>
        <h3>Processing history</h3>
        <Timeline history={detail.history} />
      </motion.aside>
    </div>
  );
}
export function Timeline({ history = [] }) {
  return (
    <div className="timeline">
      {history.map((a) => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="timeline-item"
        >
          <span className={"timeline-dot " + a.stage.toLowerCase()}>
            {a.stage === "SUCCESS" ? (
              <CheckCircle2 size={15} />
            ) : a.stage === "DUPLICATE" ? (
              <ShieldCheck size={15} />
            ) : a.stage === "FAILED" ? (
              <AlertTriangle size={15} />
            ) : (
              <Clock3 size={15} />
            )}
          </span>
          <div>
            <div className="flex justify-between gap-3">
              <b>{a.stage}</b>
              <time>{time(a.timestamp)}</time>
            </div>
            <p>{a.message}</p>
            <small>
              Attempt {a.attempt} · Run {a.generation + 1}
            </small>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
