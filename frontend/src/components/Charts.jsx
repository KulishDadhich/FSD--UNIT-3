import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
const tip = {
  background: "#171c2d",
  border: "1px solid #30364b",
  borderRadius: 12,
  color: "#e8eaf3",
};
export function Throughput({ data = [] }) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="purpleFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#202639" vertical={false} />
          <XAxis
            dataKey="time"
            tickFormatter={(v) =>
              new Date(v).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            }
            tick={{ fill: "#778099", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            minTickGap={25}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#778099", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={tip}
            labelFormatter={(v) => new Date(v).toLocaleTimeString()}
          />
          <Area
            animationDuration={400}
            name="Successful publications"
            type="monotone"
            dataKey="success"
            stroke="#9a74ff"
            fill="url(#purpleFill)"
            strokeWidth={2.5}
          />
          <Area
            animationDuration={400}
            name="DLQ arrivals"
            type="monotone"
            dataKey="failed"
            stroke="#fb7185"
            fill="transparent"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function Outcomes({ stats }) {
  const s = stats || {},
    pending = Math.max(0, (s.total || 0) - (s.success || 0) - (s.failed || 0));
  const values = [
    { name: "Successful", value: s.success || 0 },
    { name: "Failed / DLQ", value: s.failed || 0 },
    { name: "Pending", value: pending },
  ];
  const colors = ["#34d399", "#fb7185", "#8b5cf6"];
  return (
    <>
      <div className="donut">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              animationDuration={400}
              data={s.total ? values : [{ name: "No events", value: 1 }]}
              dataKey="value"
              innerRadius={66}
              outerRadius={84}
              paddingAngle={s.total ? 5 : 0}
              stroke="none"
            >
              {(s.total ? values : [{}]).map((_, i) => (
                <Cell key={i} fill={s.total ? colors[i] : "#252b3d"} />
              ))}
            </Pie>
            {!!s.total && <Tooltip contentStyle={tip} />}
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-label">
          <b>{s.total ? s.successRate + "%" : "—"}</b>
          <span>{s.total ? "success rate" : "awaiting events"}</span>
        </div>
      </div>
      <div className="legend">
        {values.map((d, i) => (
          <div key={d.name}>
            <i style={{ background: colors[i] }} />
            {d.name}
            <b>{d.value}</b>
          </div>
        ))}
      </div>
    </>
  );
}
export function AttemptsChart({ data = [] }) {
  return (
    <div className="chart small">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis
            dataKey="name"
            tick={{ fill: "#929bb2", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#929bb2", fontSize: 11 }}
            width={24}
          />
          <Tooltip contentStyle={tip} />
          <Bar
            animationDuration={400}
            dataKey="value"
            name="Events"
            fill="#8b5cf6"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
