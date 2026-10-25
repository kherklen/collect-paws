import "server-only";
import { createClient } from "@supabase/supabase-js";

// Supabase with the secret key: skips the row rules, so it can see everyone's
// captures. Server routes only, and they must only send back what the person may see.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
}
