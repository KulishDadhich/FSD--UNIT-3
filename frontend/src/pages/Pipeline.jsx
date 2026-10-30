import { motion } from "framer-motion";
import { Send, Radio, Cpu, CheckCircle2, ArrowRight } from "lucide-react";
import { useLive } from "../hooks/useLive";
import { Panel, Empty, Timeline, Badge, short } from "../components/UI";
import DemoLab from "../components/DemoLab";
export function PipelineView({ logs = [] }) {
  const latest = logs[0],
    recent = latest && Date.now() - new Date(latest.timestamp).getTime() < 6000;
  const activeStage = (stage) =>
    recent &&
    logs.some(
      (log) =>
        log.eventId === latest.eventId &&
        stage.active.includes(log.stage) &&
        Date.now() - new Date(log.timestamp).getTime() < 6000,
    );
  const stages = [
    {
      label: "Producer",
      sub: "Spring Boot scheduler",
      icon: Send,
      active: ["SCHEDULED", "QUEUED", "REPLAY"],
    },
    {
      label: "Kafka topic",
      sub: "scheduled-posts · 3 partitions",
      icon: Radio,
      active: ["QUEUED"],
    },
    {
      label: "Consumer",
      sub: "Spring Kafka listener",
      icon: Cpu,
      active: ["PROCESSING", "FAILED", "RETRYING"],
    },
    {
      label: "Processing result",
      sub: latest?.stage || "Awaiting events",
      icon: CheckCircle2,
      active: ["SUCCESS", "DLQ", "DUPLICATE"],
    },
  ];
  return (
    <div className="pipeline-wrap">
      <div className="pipeline">
        {stages.map((s, i) => (
          <div className="pipeline-segment" key={s.label}>
            <motion.div
              animate={{
                boxShadow: activeStage(s)
                  ? "0 0 35px #8b5cf633"
                  : "0 0 0px #8b5cf600",
              }}
              className={
                "pipeline-node " +
                (activeStage(s) ? "active " + latest.stage.toLowerCase() : "")
              }
            >
              <span className="pipeline-number">0{i + 1}</span>
              <s.icon size={28} />
              <h3>{s.label}</h3>
              <p>{s.sub}</p>
            </motion.div>
            {i < 3 && (
              <div className="pipeline-connector">
                <ArrowRight size={18} />
                {recent && (
                  <motion.i
                    key={latest.id}
                    initial={{ left: "0%", opacity: 1 }}
                    animate={{ left: "100%", opacity: 0 }}
                    transition={{ duration: 1.5, delay: i * 0.2, repeat: 2 }}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="pipeline-caption">
        {latest ? (
          <>
            <Badge status={latest.stage} />
            <code>{short(latest.eventId)}</code>
            <span>
              Last recorded event · animations follow backend activity
            </span>
          </>
        ) : (
          <span>Waiting for the first event. No messages are flowing yet.</span>
        )}
      </div>
    </div>
  );
}
export default function Pipeline() {
  const { data: logs } = useLive("/events/activity", 700);
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">FOLLOW EVERY MESSAGE</span>
        <h1>Live Kafka Event Pipeline</h1>
        <p>
          From scheduled intent to a recorded result. Watch the actual
          processing journey.
        </p>
      </div>
      <Panel
        title="The message journey"
        subtitle="Producer → topic → consumer → result"
      >
        <PipelineView logs={logs || []} />
      </Panel>
      <DemoLab />
      <Panel
        title="Live event logs"
        subtitle="Newest activity first · persisted timestamps and attempt numbers"
      >
        {logs?.length ? (
          <div className="log-panel">
            <Timeline history={logs} />
          </div>
        ) : (
          <Empty title="The pipeline is ready" />
        )}
      </Panel>
    </>
  );
}
