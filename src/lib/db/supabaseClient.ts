import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/config/env";

let client: SupabaseClient | null | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Server-only Supabase client using the service role key. Never expose
 * this client or the service role key to the browser. Returns null when
 * Supabase is not configured — every repository in `src/lib/db/` must
 * fall back to the in-memory store in that case, per AI/DECISIONS.md.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;

  if (!isSupabaseConfigured()) {
    client = null;
    return client;
  }

  client = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  return client;
}
