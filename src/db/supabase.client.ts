import type { AstroCookies } from "astro";
import { createBrowserClient, createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { SupabaseClient as SupabaseClientType } from "@supabase/supabase-js";

import type { Database } from "./database.types";

export type SupabaseClient = SupabaseClientType<Database>;

// Cookie options for server-side auth
export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: true,
  httpOnly: true,
  sameSite: "lax",
};

// Helper function to parse cookie header
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

/**
 * Creates a Supabase server client for SSR (Astro pages, middleware, API routes)
 * Uses cookies for session management
 */
export const createSupabaseServerInstance = (context: { headers: Headers; cookies: AstroCookies }) => {
  const supabase = createServerClient<Database>(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return parseCookieHeader(context.headers.get("Cookie") ?? "");
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
        },
      },
    }
  );

  return supabase;
};

/**
 * Creates a Supabase browser client for client-side React components
 * Uses localStorage for session management
 */
export const createSupabaseBrowserClient = () => {
  return createBrowserClient<Database>(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
};
