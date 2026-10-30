export async function loginRequest(baseURL, email, password) {
  const r = await fetch(baseURL + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error || "Sign in failed");
  return body.data;
}
