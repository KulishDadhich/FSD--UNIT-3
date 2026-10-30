import { useState } from "react";
import { CalendarClock, Plus, Send, Clock3 } from "lucide-react";
import { Panel, Badge, Empty, time, short } from "../components/UI";
import { useLive } from "../hooks/useLive";
import { post, errorText } from "../services/api";
import toast from "react-hot-toast";
export default function Posts() {
  const { data: posts, error } = useLive("/posts"),
    [busy, setBusy] = useState(false),
    [title, setTitle] = useState(""),
    [content, setContent] = useState(""),
    [platform, setPlatform] = useState("LinkedIn"),
    [date, setDate] = useState(""),
    [id, setId] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await post("/posts", {
        title,
        content,
        platform,
        scheduledAt: new Date(date).toISOString(),
        eventId: id || null,
      });
      toast.success("Post saved. Kafka delivery will begin when it is due.");
      setTitle("");
      setContent("");
      setId("");
      setDate("");
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function now(id) {
    setBusy(true);
    try {
      await post("/posts/" + id + "/process-now");
      toast.success("A new, immediately due event was created.");
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">PLAN → QUEUE → DELIVER</span>
        <h1>Scheduled Post Manager</h1>
        <p>
          Your content, delivered at the right time. All publications are
          simulated.
        </p>
      </div>
      <div className="posts-layout">
        <Panel
          title="Create a scheduled post"
          subtitle="The backend holds future posts until their scheduled time."
          action={<CalendarClock size={21} className="text-purple" />}
        >
          <form className="post-form" onSubmit={submit}>
            <label>
              Post title
              <input
                required
                maxLength={160}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What’s your next big update?"
              />
            </label>
            <label>
              Content
              <textarea
                required
                maxLength={5000}
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write something worth sharing…"
              />
              <small>{content.length} / 5,000 characters</small>
            </label>
            <div className="form-row">
              <label>
                Platform
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                >
                  {["LinkedIn", "Instagram", "X", "Facebook"].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label>
                Schedule · local time
                <input
                  type="datetime-local"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            </div>
            <label>
              Event ID <small>optional · auto-generated if empty</small>
              <input
                value={id}
                onChange={(e) => setId(e.target.value)}
                maxLength={80}
                pattern="[a-zA-Z0-9_-]{1,80}"
                placeholder="e.g. launch-post-001"
              />
            </label>
            <div className="info-note">
              <Clock3 size={18} />
              <span>
                Your local time is converted to UTC. A due post is dispatched by
                the server every second.
              </span>
            </div>
            <button className="button primary" disabled={busy}>
              <Plus size={17} />
              {busy ? "Saving…" : "Schedule post"}
            </button>
          </form>
        </Panel>
        <Panel
          title="Your scheduled posts"
          subtitle={`${posts?.length || 0} events in your workspace`}
        >
          <div className="post-list">
            {error ? (
              <Empty
                title="Backend unavailable"
                text="Start Spring Boot to load your saved posts."
              />
            ) : !posts?.length ? (
              <Empty title="Make room for your next idea" />
            ) : (
              posts.map((p) => (
                <article key={p.eventId} className="post-card">
                  <div className="flex justify-between gap-3">
                    <span className="platform">{p.platform}</span>
                    <Badge status={p.status} />
                  </div>
                  <h3>{p.title}</h3>
                  <p>{p.content}</p>
                  <code>
                    {short(p.eventId)} · {p.attempts} attempts
                  </code>
                  <div className="post-card-footer">
                    <span>
                      <CalendarClock size={14} />
                      {time(p.scheduledAt)}
                    </span>
                    <button
                      className="text-link"
                      disabled={busy}
                      onClick={() => now(p.eventId)}
                    >
                      <Send size={13} />
                      Process Now
                    </button>
                  </div>
                  {p.status === "SUCCESS" && (
                    <small className="text-green">
                      ✓ Simulated Publication
                    </small>
                  )}
                </article>
              ))
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
