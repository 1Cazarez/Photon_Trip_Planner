import { createBrowserClient } from "@supabase/ssr";

// Browser Supabase client (anon key + RLS). Used by client components and Realtime.
// TODO(Kate, #7): generate DB types from J's schema (#1) and pass them as the generic.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
