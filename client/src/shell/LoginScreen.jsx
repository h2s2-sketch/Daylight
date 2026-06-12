import { useState } from "react";
import { api } from "../shared/api.js";

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.login(username.trim(), password);
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <img src="/icons/lumi.svg" alt="" className="login-logo" />
      <h1>Welcome to Lumi</h1>
      <p>Sign in to continue your study session.</p>
      <form onSubmit={submit} className="login-form">
        <label>
          Username
          <input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label>
          Password
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <div className="login-error" role="alert">{error}</div>}
        <button type="submit" disabled={loading || !username.trim() || !password}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
