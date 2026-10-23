"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Profile: display name and log out. Posts and sightings history arrive in slice 8.
export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", auth.user.id)
        .single();
      setName(data?.display_name ?? "Friend");
    })();
  }, []);

  async function logOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="mx-auto min-h-full max-w-md px-5 py-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-bold text-brand-dark">
        ← Back to map
      </Link>

      <section className="mt-6 flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm shadow-brand/10">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-3xl">
          🐾
        </div>
        <div>
          <p className="text-sm text-muted">Hi there,</p>
          <h1 className="text-2xl font-extrabold">{name ?? "…"}</h1>
        </div>
      </section>

      <button
        type="button"
        onClick={logOut}
        className="mt-6 w-full rounded-full border-2 border-brand-soft bg-white py-3 font-bold text-brand-dark transition active:scale-[0.98]"
      >
        Log out
      </button>
    </main>
  );
}
