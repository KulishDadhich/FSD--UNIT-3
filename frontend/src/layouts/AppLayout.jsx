import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Zap,
  LayoutDashboard,
  CalendarClock,
  Workflow,
  RotateCw,
  Archive,
  ShieldCheck,
  ChartNoAxesCombined,
  Network,
  Menu,
  X,
  ArrowUpRight,
  ChevronDown,
  Radio,
} from "lucide-react";
const links = [
  ["/", "Overview", LayoutDashboard],
  ["/posts", "Scheduled posts", CalendarClock],
  ["/pipeline", "Live pipeline", Workflow],
  ["/retry", "Retry mechanism", RotateCw],
  ["/dlq", "Dead letter queue", Archive],
  ["/idempotency", "Idempotency", ShieldCheck],
  ["/history", "History & analytics", ChartNoAxesCombined],
  ["/architecture", "System architecture", Network],
  ["/calendar", "Calendar", CalendarClock],
  ["/team", "Team members", ShieldCheck],
];
export default function AppLayout({ children, health, disconnected }) {
  const [open, setOpen] = useState(false),
    location = useLocation();
  return (
    <div className="app-shell">
      <aside className={"sidebar " + (open ? "open" : "")}>
        <NavLink to="/" className="brand">
          <span className="brand-icon">
            <Zap fill="currentColor" size={21} />
          </span>
          <b>
            EventFlow<span>®</span>
          </b>
        </NavLink>
        <div className="workspace-switch">
          <span className="workspace-avatar">E</span>
          <div>
            <b>Reliability workspace</b>
            <small>Local development</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {links.map(([to, label, Icon], i) => (
            <div key={to}>
              {i === 3 && (
                <span className="nav-label labs-label">RELIABILITY LABS</span>
              )}
              {i === 6 && (
                <span className="nav-label labs-label">INSIGHTS</span>
              )}
              <NavLink
                to={to}
                end
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  "nav-item " + (isActive ? "active" : "")
                }
              >
                <Icon size={18} />
                <span>{label}</span>
                {i === 2 && <i className="nav-live" />}
              </NavLink>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="experiment-card">
            <span>LEARN BY DOING</span>
            <b>Built to bounce back.</b>
            <p>Explore the power of reliable, event-driven systems.</p>
            <NavLink to="/architecture">
              Explore architecture <ArrowUpRight size={14} />
            </NavLink>
          </div>
          <div className="profile">
            <span>K</span>
            <div>
              <b>Classroom edition</b>
              <small>Experiments 3.1.1 & 3.1.2</small>
            </div>
            <span className="version">v1.0</span>
          </div>
        </div>
      </aside>
      {open && (
        <button
          className="mobile-shade"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              aria-label="Toggle navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span>Workspace</span>
            <span>/</span>
            <b>
              {links.find((l) => l[0] === location.pathname)?.[1] || "Overview"}
            </b>
          </div>
          <div className="topbar-right">
            <span
              className={"connection " + (health?.kafka ? "connected" : "")}
            >
              <i />
              {health?.kafka ? "Kafka Connected" : "Kafka Disconnected"}
            </span>
            <span className="environment">LOCAL</span>
          </div>
        </header>
        <main>
          {disconnected && (
            <div role="status" className="disconnect-banner">
              Backend connection unavailable. Start Spring Boot on port 8080;
              this page will reconnect automatically.
            </div>
          )}
          {children}
          <footer>
            <span>
              <Zap size={12} />
              EventFlow
            </span>
            <span>Reliable Events. Seamless Delivery.</span>
            <span>Simulated publications · Real Kafka processing</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
