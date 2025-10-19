import type { SupabaseClient } from "@/db/supabase.client";

/**
 * Extracts and verifies the authenticated user from the Supabase client
 *
 * This function retrieves the current user from the JWT token that was set
 * in the Supabase client (via middleware). It verifies the token is valid
 * and returns the user object.
 *
 * @param supabase - Supabase client from context.locals
 * @returns User object if authenticated, null if unauthorized or token invalid
 *
 * @example
 * ```typescript
 * const user = await extractUser(locals.supabase);
 * if (!user) {
 *   return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
 * }
 * ```
 */
export async function extractUser(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}
