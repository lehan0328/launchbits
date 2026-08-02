// ============================================================================
// NEXT.JS MIDDLEWARE — Supabase Auth Session Refresh
// Refreshes the Supabase auth session on every request so tokens stay valid.
// Also protects all routes except /login and /auth/* from unauthenticated access.
// ============================================================================

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the auth session (important — do not remove)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect routes: redirect unauthenticated users to /login
  const isAuthRoute =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/auth') ||
    request.nextUrl.pathname.startsWith('/setup');

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If user is logged in and tries to visit /login, let them through.
  // The login page can optionally redirect if it detects a valid session.
  // We do NOT redirect here to avoid infinite loops when auth user exists
  // but no matching row in the users table (user not provisioned).

  // Pass pathname to root layout via header (so it can skip shell for /login)
  supabaseResponse.headers.set('x-pathname', request.nextUrl.pathname);

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
