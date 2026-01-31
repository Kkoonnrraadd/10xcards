import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "@/db/supabase.client";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { createErrorResponse } from "@/lib/utils/error";
import { RATE_LIMITS } from "@/lib/constants";

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  // Auth pages
  "/login",
  "/register",
  "/forgot-password",
  "/update-password",
];

// Protected paths that require authentication
const PROTECTED_PATHS = ["/dashboard", "/account"];

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;
  // In test mode, bypass Supabase and treat user as authenticated
  if (import.meta.env.MODE === "test" || import.meta.env.PUBLIC_E2E_AUTH_BYPASS === "true") {
    const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));
    // For protected routes, simulate an authenticated user.
    // For public/auth routes, keep unauthenticated to allow UI/snapshots.
    context.locals.user = isProtected ? { id: "test-user", email: "test@example.com" } : null;
  } else {
    // Create Supabase server instance with cookies
    const supabase = createSupabaseServerInstance({
      cookies: context.cookies,
      headers: context.request.headers,
    });
    context.locals.supabase = supabase;

    // Get user session
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // Store user in locals
    if (user) {
      context.locals.user = {
        id: user.id,
        email: user.email,
      };
    } else {
      context.locals.user = null;
    }
  }

  // Route protection logic
  const user = context.locals.user;

  // Redirect authenticated users away from auth pages
  if (user && PUBLIC_PATHS.includes(pathname)) {
    return context.redirect("/dashboard");
  }

  // Redirect unauthenticated users to login for protected pages
  if (!user && PROTECTED_PATHS.some((path) => pathname.startsWith(path))) {
    return context.redirect("/login");
  }

  // Apply rate limiting to API routes
  if (pathname.startsWith("/api/")) {
    if (user) {
      // Determine rate limit based on endpoint
      const limit = pathname.includes("/generate") ? RATE_LIMITS.GENERATION : RATE_LIMITS.DEFAULT;

      const rateLimitResult = checkRateLimit(user.id, limit);

      if (rateLimitResult.exceeded) {
        return createErrorResponse("RATE_LIMIT_EXCEEDED", "Too many requests. Please try again later.", 429, {
          retry_after: rateLimitResult.retryAfter,
        });
      }
    }
  }

  return next();
});
