import { loginRequest } from "../services/authClient";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { login, logout } from "../store";
import { post, errorText } from "../services/api";
import { useLive } from "../hooks/useLive";
import { Panel } from "../components/UI";
export function AuthGate({ children }) {
  const user = useSelector((s) => s.auth.user),
    dispatch = useDispatch();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (register) {
        await post("/auth/register", { email, password });
        setRegister(false);
        setError(
          "Registered as viewer. Sign in; an administrator can grant editing access.",
        );
      } else
        dispatch(
          login(
            await loginRequest(
              import.meta.env.VITE_API_URL || "http://localhost:8080/api",
              email,
              password,
            ),
          ),
        );
    } catch (e) {
      setError(e.response ? errorText(e) : e.message);
    } finally {
      setBusy(false);
    }
  }
  if (user)
    return (
      <>
        <div style={{ position: "fixed", bottom: 12, right: 15, zIndex: 70 }}>
          <button
            className="button secondary"
            onClick={() => dispatch(logout())}
          >
            Sign out · {user.role}
          </button>
        </div>
        {children}
      </>
    );
  return (
    <div style={{ maxWidth: 480, margin: "10vh auto", padding: 20 }}>
      <Panel
        title="EventFlow · Team workspace"
        subtitle="Secure sign-in · one shared organization"
      >
        <form className="post-form" onSubmit={submit}>
          <h2>{register ? "Create account" : "Welcome back"}</h2>
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              minLength={10}
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <button disabled={busy} className="button primary">
            {register ? "Register" : "Sign in"}
          </button>
          <button
            type="button"
            className="text-link"
            onClick={() => setRegister(!register)}
          >
            {register ? "Back to sign in" : "Create a viewer account"}
          </button>
        </form>
      </Panel>
    </div>
  );
}
export function Team() {
  const user = useSelector((s) => s.auth.user),
    { data } = useLive("/team");
  const [message, setMessage] = useState("");
  if (user.role !== "ADMIN")
    return (
      <Panel title="Team administration">
        <p className="prose">Only administrators can manage roles.</p>
      </Panel>
    );
  return (
    <Panel
      title="Team members"
      subtitle="Shared workspace · administrators manage editing permissions"
    >
      <p className="prose">{message}</p>
      {data?.map((u) => (
        <div className="post-card" key={u.email}>
          <b>{u.email}</b>
          <span> · {u.role} </span>
          {u.role !== "ADMIN" && (
            <select
              aria-label={"Role for " + u.email}
              value={u.role}
              onChange={async (e) => {
                try {
                  await post("/team/role", {
                    email: u.email,
                    role: e.target.value,
                  });
                  setMessage(
                    "Role updated. Changes apply to subsequent API requests.",
                  );
                } catch (err) {
                  setMessage(errorText(err));
                }
              }}
            >
              <option>VIEWER</option>
              <option>EDITOR</option>
            </select>
          )}
        </div>
      ))}
    </Panel>
  );
}
