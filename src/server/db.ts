// ============================================================================
// DATA ACCESS LAYER — Supabase Queries
// Replaces the in-memory store.ts with real PostgreSQL queries via Supabase.
// All functions are async and use the server-side Supabase client.
//
// Design principles (inspired by Google's launch system):
//   • Every query is explicit — no magic select-all
//   • Writes always return the mutated row(s) for optimistic UI
//   • Event logging is co-located with mutations (audit trail)
//   • User context flows from auth, not hardcoded IDs
// ============================================================================

import { createClient } from '@/server/supabase';
import { createAdminClient } from '@/server/admin';
import { PG_UNIQUE_VIOLATION, PGRST_NO_ROWS } from '@/lib/db-errors';
import type {
  Organization, User, Launch, LaunchReview,
  LaunchEvent, ReviewDefinition, ReviewWithLaunch,
  LaunchFormData,
} from '@/lib/types';

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Get the authenticated user's app-level profile from the users table.
 * If the user is authenticated via Supabase Auth but has no users table entry,
 * auto-provisions a new user record (Phase 2B: first-login provisioning).
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser || !authUser.email) return null;

  // Try to find existing user profile
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', authUser.email)
    .single();

  if (existingUser) return existingUser as User;

  // ── Auto-provision: create user on first login ──────────────────────────
  // Uses the admin (service_role) client to bypass RLS — the anon client
  // can't read organizations or insert users before the user exists.
  // For MVP (single-tenant), assign to the first organization found.
  const admin = createAdminClient();

  if (!admin) {
    console.warn('[auth] Admin client unavailable — cannot auto-provision user:', authUser.email);
    return null;
  }

  const { data: orgData } = await admin
    .from('organizations')
    .select('id')
    .limit(1)
    .single();

  const defaultOrg = orgData as { id: string } | null;

  if (!defaultOrg) {
    console.warn('[auth] No organization found for auto-provisioning user:', authUser.email);
    return null;
  }

  // Derive display name from auth metadata or email
  const displayName =
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name ||
    authUser.email.split('@')[0];

  const avatarUrl = authUser.user_metadata?.avatar_url || null;

  // First user in the org gets admin role; subsequent users get member
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: existingUserCount } = await (admin as any)
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', defaultOrg.id);

  const assignedRole = (existingUserCount === 0 || existingUserCount === null) ? 'admin' : 'member';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newUserData, error } = await (admin as any)
    .from('users')
    .upsert({
      org_id: defaultOrg.id,
      email: authUser.email,
      display_name: displayName,
      avatar_url: avatarUrl,
      role: assignedRole,
    }, { onConflict: 'org_id,email', ignoreDuplicates: true })
    .select('*')
    .single();

  if (error) {
    // Race condition: another request already inserted this user.
    // Fetch the existing row instead of failing.
    if (error.code === PG_UNIQUE_VIOLATION || error.code === PGRST_NO_ROWS) {
      const { data: raceUser } = await admin
        .from('users')
        .select('*')
        .eq('email', authUser.email)
        .eq('org_id', defaultOrg.id)
        .single();
      return (raceUser as unknown as User) ?? null;
    }
    console.error('[auth] Failed to auto-provision user:', error);
    return null;
  }

  const newUser = newUserData as User | null;
  console.log('[auth] Auto-provisioned new user:', newUser?.email);
  return newUser;
}

/** Get user by ID. */
export async function getUserById(id: string): Promise<User | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('users').select('*').eq('id', id).single();
  return data as User | null;
}

// ── Organization ────────────────────────────────────────────────────────────

export async function getOrganization(orgId: string): Promise<Organization | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();
  return data as Organization | null;
}

// ── Launches ────────────────────────────────────────────────────────────────

export async function getLaunches(orgId: string): Promise<Launch[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('launches')
    .select('*')
    .eq('org_id', orgId)
    .order('display_id', { ascending: false });

  if (error) {
    console.error('getLaunches error:', error);
    return [];
  }
  return (data ?? []) as Launch[];
}

export async function getLaunchById(id: string): Promise<Launch | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('launches')
    .select('*')
    .eq('id', id)
    .single();
  return data as Launch | null;
}

export async function createLaunch(
  orgId: string,
  userId: string,
  formData: LaunchFormData
): Promise<Launch | null> {
  const supabase = await createClient();

  const { data: launch, error } = await supabase
    .from('launches')
    .insert({
      org_id: orgId,
      name: formData.name,
      description: formData.description || null,
      status: 'DRAFT',
      risk_level: 'LOW', // Will be recalculated
      version: 1,
      target_date: formData.target_date || null,
      hard_deadline: formData.hard_deadline,
      q_data_classes: formData.q_data_classes,
      q_target_population: formData.q_target_population,
      q_processing_purpose: formData.q_processing_purpose,
      q_consent_mechanism: formData.q_consent_mechanism,
      q_retention_ttl: formData.q_retention_ttl,
      q_deletion_controls: formData.q_deletion_controls,
      q_external_sharing: formData.q_external_sharing,
      q_ai_model_scope: formData.q_ai_model_scope,
      q_automated_decisions: formData.q_automated_decisions,
      q_network_exposure: formData.q_network_exposure,
      q_auth_secrets: formData.q_auth_secrets,
      q_input_parsing: formData.q_input_parsing,
      github_repo: formData.github_repo || null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('createLaunch error:', error);
    return null;
  }

  // Add the creator as primary owner
  await supabase.from('launch_owners').insert({
    launch_id: launch.id,
    user_id: userId,
    is_primary: true,
  });

  // Log the creation event
  await addEvent(launch.id, 1, 'LAUNCH_CREATED', userId);

  return launch as Launch;
}

export async function updateLaunch(
  id: string,
  updates: Partial<Launch>
): Promise<Launch | null> {
  const supabase = await createClient();

  // Remove fields that shouldn't be directly updated
  const { id: _id, org_id: _org, display_id: _did, created_by: _cb, created_at: _ca, ...safeUpdates } = updates as Record<string, unknown>;

  const { data, error } = await supabase
    .from('launches')
    .update({ ...safeUpdates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('updateLaunch error:', error);
    return null;
  }
  return data as Launch;
}

// ── Reviews ─────────────────────────────────────────────────────────────────

export async function getReviewsForLaunch(launchId: string): Promise<LaunchReview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('launch_reviews')
    .select(`
      *,
      review_definitions!inner (
        label,
        review_type,
        reviewer_emails,
        reviewer_slack_channel
      )
    `)
    .eq('launch_id', launchId);

  if (error) {
    console.error('getReviewsForLaunch error:', error);
    return [];
  }

  // Flatten the joined review_definitions into the review object
  return (data ?? []).map((r: Record<string, unknown>) => {
    const rd = r.review_definitions as Record<string, unknown> | null;
    return {
      ...r,
      label: rd?.label ?? '',
      review_type: rd?.review_type ?? '',
      reviewer_emails: rd?.reviewer_emails ?? [],
      reviewer_slack_channel: rd?.reviewer_slack_channel ?? null,
      review_definitions: undefined,
    };
  }) as unknown as LaunchReview[];
}

export async function getPendingReviewsForUser(
  orgId: string,
  _userId: string
): Promise<ReviewWithLaunch[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('launch_reviews')
    .select(`
      *,
      review_definitions!inner (label, review_type),
      launches!inner (*)
    `)
    .in('status', ['PENDING_REVIEW', 'IN_PROGRESS'])
    .eq('launches.org_id', orgId);

  if (error) {
    console.error('getPendingReviewsForUser error:', error);
    return [];
  }

  return (data ?? []).map((r: Record<string, unknown>) => {
    const rd = r.review_definitions as Record<string, unknown> | null;
    const launch = r.launches as Launch;
    return {
      ...r,
      label: rd?.label ?? '',
      review_type: rd?.review_type ?? '',
      launch,
      review_definitions: undefined,
      launches: undefined,
    };
  }) as unknown as ReviewWithLaunch[];
}

export async function addReview(review: Partial<LaunchReview>): Promise<LaunchReview | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('launch_reviews')
    .insert({
      launch_id: review.launch_id,
      review_definition_id: review.review_definition_id,
      status: review.status ?? 'PENDING_REVIEW',
      notes: review.notes ?? null,
      reviewed_by: review.reviewed_by ?? null,
      reviewed_by_name: review.reviewed_by_name ?? null,
      reviewed_at: review.reviewed_at ?? null,
      slo_started_at: review.slo_started_at ?? null,
      slo_due_at: review.slo_due_at ?? null,
      slo_breached: review.slo_breached ?? false,
      trigger_reason: review.trigger_reason ?? null,
      fyi_allowed: review.fyi_allowed ?? true,
      owner_approval_disallowed: review.owner_approval_disallowed ?? false,
      access_restricted: review.access_restricted ?? false,
    })
    .select()
    .single();

  if (error) {
    console.error('addReview error:', error);
    return null;
  }
  return data as LaunchReview;
}

export async function updateReview(
  id: string,
  updates: Partial<LaunchReview>
): Promise<LaunchReview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('launch_reviews')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('updateReview error:', error);
    return null;
  }
  return data as LaunchReview;
}

// ── Review Definitions (Mutations) ──────────────────────────────────────────

export async function updateReviewDefinition(
  id: string,
  updates: Partial<ReviewDefinition>
): Promise<ReviewDefinition | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('review_definitions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('updateReviewDefinition error:', error);
    return null;
  }
  return data as ReviewDefinition;
}

// ── Events (Audit Log) ─────────────────────────────────────────────────────

export async function getAllEvents(orgId: string): Promise<LaunchEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('launch_events')
    .select(`
      *,
      launches!inner (org_id)
    `)
    .eq('launches.org_id', orgId)
    .order('performed_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('getAllEvents error:', error);
    return [];
  }

  return (data ?? []).map((e: Record<string, unknown>) => {
    const { launches: _l, ...event } = e;
    return event;
  }) as unknown as LaunchEvent[];
}

export async function getEventsForLaunch(launchId: string): Promise<LaunchEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('launch_events')
    .select('*')
    .eq('launch_id', launchId)
    .order('performed_at', { ascending: false });

  if (error) {
    console.error('getEventsForLaunch error:', error);
    return [];
  }
  return (data ?? []) as LaunchEvent[];
}

export async function addEvent(
  launchId: string,
  version: number,
  eventType: string,
  performedBy: string | null,
  details?: { field?: string; old?: unknown; new_val?: unknown; notes?: string }
): Promise<void> {
  const supabase = await createClient();

  // Look up the user's display name
  let performedByName: string | null = null;
  if (performedBy) {
    const { data: user } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', performedBy)
      .single();
    performedByName = user?.display_name ?? null;
  }

  await supabase.from('launch_events').insert({
    launch_id: launchId,
    launch_version: version,
    event_type: eventType,
    performed_by: performedBy,
    performed_by_name: performedByName,
    field_changed: details?.field ?? null,
    old_value: details?.old ?? null,
    new_value: details?.new_val ?? null,
    notes: details?.notes ?? null,
  });
}

// ── Review Definitions ──────────────────────────────────────────────────────

export async function getReviewDefinitions(orgId: string): Promise<ReviewDefinition[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('review_definitions')
    .select('*')
    .eq('org_id', orgId);

  if (error) {
    console.error('getReviewDefinitions error:', error);
    return [];
  }
  return (data ?? []) as ReviewDefinition[];
}
