import { useState } from "react";
import { useLive } from "../hooks/useLive";
import { Panel, Badge } from "../components/UI";
export default function Calendar() {
  const { data = [] } = useLive("/posts");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [year, m] = month.split("-").map(Number);
  const days = new Date(year, m, 0).getDate();
  return (
    <Panel
      title="Publishing calendar"
      subtitle="Your browser’s local timezone · select Scheduled posts to create an event"
    >
      <input
        aria-label="Calendar month"
        type="month"
        value={month}
        onChange={(e) => setMonth(e.target.value)}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
          gap: 10,
          padding: 20,
        }}
      >
        {Array.from({ length: days }, (_, i) => {
          const date = i + 1;
          return (
            <div className="post-card" key={date}>
              <b>{date}</b>
              {(data || [])
                .filter((p) => {
                  const d = new Date(p.scheduledAt);
                  return (
                    d.getFullYear() === year &&
                    d.getMonth() === m - 1 &&
                    d.getDate() === date
                  );
                })
                .map((p) => (
                  <div key={p.eventId} style={{ marginTop: 12 }}>
                    <p>{p.title}</p>
                    <small>
                      {new Date(p.scheduledAt).toLocaleTimeString()}
                    </small>
                    <Badge status={p.status} />
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
