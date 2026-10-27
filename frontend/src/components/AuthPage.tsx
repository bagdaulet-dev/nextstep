import { useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, LockKeyhole, LoaderCircle } from "lucide-react";
import { useAuth } from "../auth";
import type { Session } from "../types";
import { Brand } from "./Brand";
import { GlassOrbit } from "./GlassOrbit";
import { ErrorMessage } from "./UI";

export function AuthPage() {
  const { client, session, accept, error: connectionError, refresh } = useAuth();
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = await client.request<Session>(
        register ? "/auth/register/" : "/auth/login/",
        { method: "POST", body: { ...(register ? { name } : {}), email, password } },
      );
      accept(data);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function demo() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      accept(await client.request<Session>("/auth/demo/", { method: "POST" }));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <header className="auth-header">
        <Brand />
        <span>Your next chapter, thoughtfully organized.</span>
      </header>
      <main className="auth-main">
        <section className="auth-intro">
          <div className="subtle-kicker">
            <span />A little clarity goes a long way
          </div>
          <h1>
            Good things
            <br />
            start with
            <br />a next step.
          </h1>
          <p>
            A calm place for your applications,
            <br className="desktop-only" /> conversations, and what comes next.
          </p>
          <GlassOrbit decorative />
          <div className="auth-private">
            <LockKeyhole size={14} />
            <span>Private to your account. Always in your control.</span>
          </div>
        </section>
        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-card-top">
            <span className="auth-card-symbol">
              <ArrowUpRight size={24} strokeWidth={1.5} />
            </span>
            <h2 id="auth-title">
              {register ? "Make room for what’s next." : "A fresh perspective."}
            </h2>
            <p>
              {register
                ? "Create your personal application workspace."
                : "Sign in to pick up where you left off."}
            </p>
          </div>
          <form onSubmit={(event) => void submit(event)}>
            {register && (
              <label>
                Full name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  name="name"
                  autoComplete="name"
                  maxLength={80}
                  required
                  placeholder="Alex Morgan"
                />
              </label>
            )}
            <label>
              Email address
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                name="email"
                type="email"
                spellCheck={false}
                autoComplete="email"
                maxLength={254}
                required
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                minLength={register ? 10 : undefined}
                maxLength={128}
                required
                placeholder={register ? "At least 10 characters" : "Your password"}
              />
            </label>
            {register && (
              <p className="field-hint">
                Use a unique password with at least 10 characters.
              </p>
            )}
            <ErrorMessage error={error || connectionError} />
            {connectionError ? (
              <button
                type="button"
                className="button primary full-width"
                onClick={() => void refresh()}
              >
                Reconnect
              </button>
            ) : (
              <button
                className="button primary full-width auth-submit"
                disabled={busy}
                aria-busy={busy}
                type="submit"
              >
                {busy ? (
                  <>
                    <LoaderCircle className="spinner" size={17} aria-hidden="true" />
                    <span>Opening workspace…</span>
                  </>
                ) : (
                  <>
                    {register ? "Create your workspace" : "Sign in"}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            )}
          </form>
          <p className="auth-switch">
            {register ? "Already have a workspace?" : "New here?"}{" "}
            <button
              disabled={busy}
              onClick={() => {
                setRegister(!register);
                setError(null);
                setPassword("");
              }}
            >
              {register ? "Sign in" : "Create an account"}
            </button>
          </p>
          {session?.demo_enabled && (
            <div className="demo-option">
              <div className="or-divider">
                <span />
                or take a look around
                <span />
              </div>
              <button
                className="button demo-button full-width"
                disabled={busy}
                onClick={() => void demo()}
              >
                Explore the demo
                <ArrowUpRight size={16} />
              </button>
              <p>Fictional data. A workspace of your own.</p>
            </div>
          )}
        </section>
      </main>
      <footer className="auth-footer">
        <span>Nextstep · Job application tracker</span>
        <span>Focus on the opportunity. We’ll keep the details together.</span>
      </footer>
    </div>
  );
}
