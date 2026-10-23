import { createBrowserClient } from "@supabase/ssr";

// Browser Supabase client. Safe to expose the anon key because every table has RLS on.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
