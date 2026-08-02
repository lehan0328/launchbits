// ============================================================================
// SUPABASE ADMIN CLIENT (Service Role)
// Bypasses RLS — used ONLY for admin operations like user auto-provisioning.
// NEVER expose this client to the browser or client-side code.
// ============================================================================

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

let adminClient: ReturnType<typeof createSupabaseClient> | null = null;

/**
 * Creates a Supabase client using the service_role key.
 * This client bypasses all RLS policies — use with extreme caution.
 * Only for server-side admin operations (e.g., auto-provisioning users).
 */
export function createAdminClient() {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local and Vercel env vars.'
    );
  }

  adminClient = createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
