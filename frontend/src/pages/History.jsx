import { Panel, Metric } from "../components/UI";
import EventTable from "../components/EventTable";
import { Throughput, AttemptsChart } from "../components/Charts";
import { useLive } from "../hooks/useLive";
import {
  Archive,
  ShieldCheck,
  CheckCircle2,
  TriangleAlert,
} from "lucide-react";
export default function History() {
  const { data: a } = useLive("/analytics"),
    { data: s } = useLive("/dashboard/stats");
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">OBSERVE & UNDERSTAND</span>
        <h1>Event History & Analytics</h1>
        <p>
          Every attempt leaves a trace. Explore the records behind your
          reliability metrics.
        </p>
      </div>
      <div className="metrics four">
        <Metric
          label="Successful events"
          value={s?.success}
          icon={CheckCircle2}
          color="green"
        />
        <Metric
          label="Failed / DLQ events"
          value={s?.failed}
          icon={TriangleAlert}
          color="red"
        />
        <Metric label="In dead letter queue" value={s?.dlq} icon={Archive} />
        <Metric
          label="Duplicates prevented"
          value={s?.duplicates}
          icon={ShieldCheck}
          color="cyan"
        />
      </div>
      <div className="overview-charts">
        <Panel title="Events processed over time" subtitle="Last 12 minutes">
          <Throughput data={a?.series} />
        </Panel>
        <Panel
          title="Delivery attempt distribution"
          subtitle="Lifetime attempts per event"
        >
          <AttemptsChart data={a?.attempts} />
        </Panel>
      </div>
      <Panel
        title="All event records"
        subtitle="Search, filter, inspect, or export your actual database records"
      >
        <EventTable />
      </Panel>
    </>
  );
}
