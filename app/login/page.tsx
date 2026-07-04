"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Sign-in for the one user of this deployment. The account is created in the
// Supabase dashboard (Authentication → Add user) — there is no sign-up flow.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-card border border-teal-border bg-teal-dim font-serif text-[30px] font-medium text-teal">
            C
          </div>
          <div className="text-center">
            <h1 className="font-serif text-[28px] font-medium leading-tight text-ink">Chief</h1>
            <p className="chief-voice mt-1 text-base text-ink-2">
              A chief of staff in your pocket.
            </p>
          </div>
        </div>

        <form
          onSubmit={signIn}
          className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-5"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-micro text-ink-3">EMAIL</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-control border border-hairline bg-raised px-3.5 text-body text-ink placeholder:text-ink-3"
              placeholder="you@example.com"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-micro text-ink-3">PASSWORD</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-control border border-hairline bg-raised px-3.5 text-body text-ink"
            />
          </label>

          {error && <p className="text-label text-danger">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 h-12 rounded-control font-medium text-[16px] disabled:opacity-60"
            style={{ background: "var(--teal-fill)", color: "var(--teal-on-fill)" }}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-meta mt-4 text-center text-ink-3">
          One user per deployment. Create your account in the Supabase dashboard.
        </p>
      </div>
    </div>
  );
}
