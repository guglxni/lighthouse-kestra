"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "signup" | "login";

export function AuthCard({ mode }: { mode: Mode }) {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setInfo(null);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (error) throw error;
        if (data.session) {
          router.replace(next);
        } else {
          setInfo("Check your inbox to confirm your email, then sign in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next);
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const isSignup = mode === "signup";

  return (
    <div className="glass-panel w-full max-w-md space-y-6 p-8">
      <div className="space-y-2 text-center">
        <div className="flex justify-center mb-1">
          <Image
            src="/branding/logo-lockup-clean.png"
            alt="Lighthouse"
            width={1461}
            height={822}
            className="h-10 w-auto"
            priority
          />
        </div>
        <h1 className="font-display text-3xl text-ink-50">{isSignup ? "Create your account" : "Welcome back"}</h1>
        <p className="text-sm text-ink-400">
          {isSignup
            ? "Daily research briefs, in your channels. Free to try with your own API keys."
            : "Sign in to keep your sources, models and delivery channels."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-ink-300" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-ink-50 placeholder-ink-500 focus:border-beam focus:outline-none"
            placeholder="you@studio.com"
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-ink-300" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-ink-50 placeholder-ink-500 focus:border-beam focus:outline-none"
            placeholder={isSignup ? "Choose a strong password (8+ chars)" : "Your password"}
            autoComplete={isSignup ? "new-password" : "current-password"}
          />
        </div>
        {error ? (
          <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">{error}</p>
        ) : null}
        {info ? (
          <p className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">{info}</p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-beam px-5 py-3 text-sm font-semibold text-ink-950 shadow-[0_18px_45px_rgba(56,189,248,0.35)] transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {busy ? "Working…" : isSignup ? "Create account" : "Sign in"}
        </button>
      </form>

      <div className="text-center text-xs text-ink-400">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-beam hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-beam hover:underline">
              Create an account
            </Link>
          </>
        )}
      </div>

      <p className="text-center text-[11px] text-ink-500">
        We use Supabase for sign-in. No marketing emails — only the confirmation link and password resets.
      </p>
    </div>
  );
}
