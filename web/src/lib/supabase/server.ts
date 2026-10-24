import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server Supabase client for Server Components, Route Handlers, and Server Actions.
// TODO(Kate, #7): add the session-refresh proxy/middleware from the Supabase SSR guide for
//   this Next.js version, and protect /trips routes.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component; the proxy refreshes the session instead.
          }
        },
      },
    },
  );
}
