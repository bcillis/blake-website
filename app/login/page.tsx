"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/");
  };

  if (user) {
    return (
      <div className="max-w-md mx-auto px-6 pt-20 pb-24 fade-up">
        <p className="meta mb-5">Signed in</p>
        <h1 className="page-title mb-5">You&apos;re in.</h1>
        <p className="lead mb-8">
          Add and edit controls are now visible across the site.
        </p>
        <Link href="/" className="btn">
          Go home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-6 pt-20 pb-24 fade-up">
      <p className="meta mb-5">Owner access</p>
      <h1 className="page-title mb-5">Sign in.</h1>
      <p className="lead mb-8">
        There&apos;s one account, and it&apos;s mine. Nothing to sign up for.
      </p>

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label htmlFor="email" className="meta block mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="meta block mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
            required
          />
        </div>

        {error && (
          <div role="alert" className="alert">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn w-full">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
