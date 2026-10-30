import { useState } from "react";
import { motion } from "framer-motion";
import {
  Monitor,
  Server,
  Send,
  Radio,
  Cpu,
  Database,
  RotateCw,
  Archive,
  ArrowDown,
  ArrowRight,
} from "lucide-react";
import { Panel } from "../components/UI";
const nodes = [
  [
    "React frontend",
    Monitor,
    "Your control room",
    "The browser schedules posts and reads backend records. It never decides whether processing succeeded.",
  ],
  [
    "Spring Boot REST API",
    Server,
    "The front desk",
    "Validates the request and stores the event in the persistent H2 database before returning an event ID.",
  ],
  [
    "Kafka producer",
    Send,
    "The messenger",
    "The scheduler finds due posts. It sends their JSON payloads to Kafka, waiting for broker acknowledgement.",
  ],
  [
    "Kafka topic",
    Radio,
    "The durable conveyor belt",
    "scheduled-posts stores messages across three partitions. The event ID is the message key.",
  ],
  [
    "Kafka consumer",
    Cpu,
    "The worker",
    "Receives a message, locks its database record, and checks whether a publication already exists.",
  ],
  [
    "Database",
    Database,
    "The memory",
    "Stores a single simulated publication for each event ID, along with attempts and the processing history.",
  ],
  [
    "Retry policy",
    RotateCw,
    "Try again, carefully",
    "After controlled failures, Spring Kafka waits 2 seconds and then 4 seconds before the final attempt.",
  ],
  [
    "Dead letter queue",
    Archive,
    "The inspection desk",
    "After repeated failure, the recoverer publishes to scheduled-posts-dlt. A separate listener confirms arrival.",
  ],
];
export default function Architecture() {
  const [selected, setSelected] = useState(0),
    [animate, setAnimate] = useState(false);
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">THE BIG PICTURE</span>
        <h1>A system built to recover.</h1>
        <p>
          Select a component to understand its role. This diagram is an
          explanatory model, not live traffic.
        </p>
      </div>
      <div className="architecture-layout">
        <Panel
          title="EventFlow architecture"
          subtitle="Click any component to explore"
        >
          <div className="architecture">
            {nodes.slice(0, 5).map(([name, Icon], i) => (
              <div key={name}>
                <button
                  onClick={() => setSelected(i)}
                  className={"arch-node " + (selected === i ? "selected" : "")}
                >
                  <Icon size={22} />
                  <b>{name}</b>
                  <span>0{i + 1}</span>
                </button>
                <ArrowDown size={19} className="arch-arrow" />
              </div>
            ))}
            <div className="arch-branches">
              {nodes.slice(5).map(([name, Icon], i) => (
                <button
                  key={name}
                  onClick={() => setSelected(i + 5)}
                  className={
                    "arch-node " + (selected === i + 5 ? "selected" : "")
                  }
                >
                  <Icon size={21} />
                  <b>{name}</b>
                </button>
              ))}
            </div>
          </div>
        </Panel>
        <div className="architecture-detail">
          <Panel title={nodes[selected][0]} subtitle={nodes[selected][2]}>
            <motion.p
              key={selected}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="prose"
            >
              {nodes[selected][3]}
            </motion.p>
          </Panel>
          <Panel
            title="What happens when something goes wrong?"
            subtitle="Illustrative animation · not a backend demonstration"
          >
            <p className="prose">
              A temporary failure gets another chance. A persistent failure
              moves to an inspection queue. Once corrected, it can be replayed
              with its original ID.
            </p>
            <button
              className="button secondary m-5"
              onClick={() => setAnimate(!animate)}
            >
              <RotateCw size={15} />
              {animate ? "Pause explanation" : "Animate failure path"}
            </button>
            <div className="failure-path">
              {["Failure", "Retry 2s", "Retry 4s", "DLQ"].map((label, i) => (
                <motion.span
                  key={label}
                  animate={
                    animate ? { opacity: [0.25, 1, 0.25] } : { opacity: 1 }
                  }
                  transition={{ duration: 4, delay: i * 0.7, repeat: Infinity }}
                >
                  {label}
                </motion.span>
              ))}
            </div>
          </Panel>
          <div className="info-note">
            <Database size={22} />
            <span>
              The database and Kafka serve different purposes: one records
              business results, the other transports events.
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
