"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { FadeUp } from "@/components/Motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  if (user) {
    return (
      <div className="max-w-md mx-auto px-6 py-20">
        <FadeUp>
          <div className="card text-center">
            <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] text-xl">
              ✓
            </div>
            <h1 className="font-serif text-2xl mb-2 text-[var(--text-primary)]">You&apos;re signed in</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              You can now add and edit content across the site.
            </p>
            <button onClick={() => router.push("/")} className="btn-primary">
              Go home →
            </button>
          </div>
        </FadeUp>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <FadeUp>
        <div className="card">
          <div className="text-center mb-6">
            <span className="eyebrow mb-3">Owner access</span>
            <h1 className="font-serif text-3xl text-[var(--text-primary)] mt-2 mb-2">Sign in</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Sign in to add and edit content.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)]">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Signing in..." : "Sign in →"}
            </button>
          </form>
        </div>
      </FadeUp>
    </div>
  );
}
