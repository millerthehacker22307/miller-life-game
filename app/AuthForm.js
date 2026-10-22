"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthForm({ mode }) {
  const isLogin = mode === "login";
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await fetch(`/api/auth/${isLogin ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setBusy(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div className="wrap auth-wrap">
      <div className="logo auth-logo">
        ⚔️ LIFE <span>GAME</span>
      </div>
      <p className="auth-hero">Make your life a game — daily quests, XP, streaks.</p>

      <section className="panel auth-card">
        <h2>{isLogin ? "Welcome Back, Player" : "Create Your Account"}</h2>
        <form onSubmit={submit}>
          <label className="field">
            <span>Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. shadow_runner"
              autoComplete="username"
              autoCapitalize="none"
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isLogin ? "Your password" : "At least 6 characters"}
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
            />
          </label>
          {error ? <div className="auth-error">{error}</div> : null}
          <button className="btn auth-btn" type="submit" disabled={busy}>
            {busy ? "Please wait…" : isLogin ? "Log In" : "Create Account"}
          </button>
        </form>
        <div className="auth-switch">
          {isLogin ? (
            <>
              New to Life Game? <a href="/register">Create an account</a>
            </>
          ) : (
            <>
              Already playing? <a href="/login">Log in</a>
            </>
          )}
        </div>
      </section>

      <div className="auth-credit">Created by Miller</div>
    </div>
  );
}
