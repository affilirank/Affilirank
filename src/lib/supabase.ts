import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser (client-side) Supabase client.
 * Used for Realtime subscriptions so published deals appear instantly on the
 * homepage stream without a refresh.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createBrowserClient(url, anonKey);
}
