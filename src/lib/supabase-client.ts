// ============================================================================
// SUPABASE BROWSER CLIENT
// Used in Client Components for real-time subscriptions and client-side queries.
// Creates a new client on each call — safe for SSR and client-side usage.
// ============================================================================

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
  }

  return createBrowserClient(url, key);
}
