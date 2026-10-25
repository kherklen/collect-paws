"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();

    const { error } =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: displayName.trim() } },
          })
        : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Supabase's own messages are English; translate the two people actually hit.
      setError(
        error.code === "invalid_credentials"
          ? t.login.badCredentials
          : error.code === "user_already_exists" || error.code === "email_exists"
            ? t.login.alreadyRegistered
            : error.message,
      );
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="relative mx-auto flex min-h-full max-w-sm flex-col justify-center px-6 py-12">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher compact />
      </div>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft text-4xl">
          🐾
        </div>
        <h1 className="text-3xl font-extrabold text-ink">Collect Savar</h1>
        <p className="mt-2 text-muted">{t.login.tagline}</p>
      </div>

      <div className="mb-6 flex rounded-full bg-brand-soft p-1">
        {(["login", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`flex-1 rounded-full py-2 text-sm font-bold transition ${
              mode === m ? "bg-white text-brand-dark shadow-sm" : "text-muted"
            }`}
          >
            {m === "login" ? t.login.logIn : t.login.signUp}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === "signup" && (
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t.login.displayName}
            autoComplete="nickname"
            className="rounded-2xl border border-brand-soft bg-white px-4 py-3 outline-none focus:border-brand"
          />
        )}
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.login.email}
          autoComplete="email"
          className="rounded-2xl border border-brand-soft bg-white px-4 py-3 outline-none focus:border-brand"
        />
        <input
          required
          type="password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t.login.password}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className="rounded-2xl border border-brand-soft bg-white px-4 py-3 outline-none focus:border-brand"
        />
        {error && <p className="px-1 text-sm text-sos">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-2 rounded-full bg-brand py-3 font-bold text-white shadow-md shadow-brand/30 transition active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? t.login.oneMoment : mode === "login" ? t.login.logIn : t.login.createAccount}
        </button>
      </form>
    </main>
  );
}
