/**
 * GitHub Check Runs Orchestration
 *
 * Server-side functions that coordinate between the database and GitHub API
 * to create/update check runs when launch review status changes.
 */

import { createAdminClient } from '@/server/admin';
import {
  getInstallationToken,
  createCheckRun,
  updateCheckRun,
  parseOwnerRepo,
  type CheckConclusion,
} from '@/lib/github';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.launchbits.dev';
const CHECK_NAME = 'Launchbits Review Gate';

// ============================================================================
// Public API
// ============================================================================

/**
 * Create or update the check run for a launch when reviews change.
 * Called from actions.ts after submit/approve/deny.
 *
 * Flow:
 * 1. Look up the launch + org
 * 2. If org has no GitHub app installation, silently return
 * 3. If launch has no github_repo + PR, silently return
 * 4. Get installation token
 * 5. Compute aggregate review status
 * 6. Create or update the check run
 */
export async function syncCheckRun(launchId: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    if (!supabase) return;

    // Fetch launch with org
    const { data: launch } = await supabase.from('launches')
      .select('id, name, github_repo, github_pr_number, status, org_id')
      .eq('id', launchId)
      .single();

    if (!launch?.github_repo || !launch?.github_pr_number) return;

    // Fetch org for installation ID
    const { data: org } = await supabase.from('organizations')
      .select('github_app_installation_id')
      .eq('id', launch.org_id)
      .single();

    if (!org?.github_app_installation_id) return;

    const parsed = parseOwnerRepo(launch.github_repo);
    if (!parsed) return;

    // Get installation token
    const token = await getInstallationToken(org.github_app_installation_id);

    // Fetch all reviews for this launch (join review_definitions for label)
    const { data: reviews } = await supabase
      .from('launch_reviews')
      .select('id, status, review_definitions(label)')
      .eq('launch_id', launchId);

    if (!reviews || reviews.length === 0) return;

    // Map to ReviewRow format expected by computeCheckStatus
    const mappedReviews: ReviewRow[] = reviews.map(r => ({
      id: r.id,
      status: r.status,
      review_name: (r.review_definitions as unknown as { label: string })?.label ?? 'Unknown',
    }));

    // Compute aggregate status
    const { status, conclusion, title, summary } = computeCheckStatus(mappedReviews, launch.name);
    const detailsUrl = `${APP_URL}/launches/${launchId}`;

    // Get the head SHA of the PR
    const headSha = await getPrHeadSha(token, parsed.owner, parsed.repo, launch.github_pr_number);
    if (!headSha) return;

    // Check if we already have a check run for this launch
    const existingCheckRunId = await findExistingCheckRun(
      token, parsed.owner, parsed.repo, headSha
    );

    if (existingCheckRunId) {
      await updateCheckRun({
        token,
        owner: parsed.owner,
        repo: parsed.repo,
        headSha,
        checkRunId: existingCheckRunId,
        name: CHECK_NAME,
        status,
        conclusion,
        title,
        summary,
        detailsUrl,
      });
    } else {
      await createCheckRun({
        token,
        owner: parsed.owner,
        repo: parsed.repo,
        headSha,
        name: CHECK_NAME,
        status,
        conclusion,
        title,
        summary,
        detailsUrl,
      });
    }

    console.log(`[GitHub] Check run synced for launch ${launchId}: ${conclusion || status}`);
  } catch (err) {
    // Fire-and-forget — don't crash the main action
    console.error('[GitHub] Failed to sync check run:', err);
  }
}

// ============================================================================
// Helpers
// ============================================================================

interface ReviewRow {
  id: string;
  status: string;
  review_name: string;
}

function computeCheckStatus(reviews: ReviewRow[], launchTitle: string) {
  const total = reviews.length;
  const approved = reviews.filter(r => r.status === 'APPROVED').length;
  const denied = reviews.filter(r => r.status === 'DENIED' || r.status === 'CHANGES_REQUESTED').length;
  const pending = reviews.filter(r => r.status === 'PENDING_REVIEW').length;
  const fyi = reviews.filter(r => r.status === 'FYI').length;

  const actionableTotal = total - fyi; // FYI reviews don't block

  if (denied > 0) {
    const deniedNames = reviews
      .filter(r => r.status === 'DENIED' || r.status === 'CHANGES_REQUESTED')
      .map(r => r.review_name)
      .join(', ');
    return {
      status: 'completed' as const,
      conclusion: 'failure' as CheckConclusion,
      title: `Changes requested (${denied} of ${actionableTotal})`,
      summary: `**${launchTitle}**\n\n❌ Changes requested by: ${deniedNames}\n\n✅ ${approved} approved · ⏳ ${pending} pending · ❌ ${denied} denied`,
    };
  }

  if (approved >= actionableTotal && actionableTotal > 0) {
    return {
      status: 'completed' as const,
      conclusion: 'success' as CheckConclusion,
      title: `All ${actionableTotal} reviews approved`,
      summary: `**${launchTitle}**\n\n✅ All required reviews have been approved. This PR is clear to merge.`,
    };
  }

  // Still waiting on reviews
  const pendingNames = reviews
    .filter(r => r.status === 'PENDING_REVIEW')
    .map(r => r.review_name)
    .join(', ');

  return {
    status: 'in_progress' as const,
    conclusion: undefined,
    title: `Waiting for reviews (${approved}/${actionableTotal} approved)`,
    summary: `**${launchTitle}**\n\n⏳ Waiting for: ${pendingNames}\n\n✅ ${approved} approved · ⏳ ${pending} pending`,
  };
}

/**
 * Get the head SHA of a PR.
 */
async function getPrHeadSha(
  token: string, owner: string, repo: string, prNumber: number
): Promise<string | null> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!res.ok) {
    console.error('[GitHub] Failed to get PR:', res.status);
    return null;
  }

  const data = await res.json();
  return data.head?.sha || null;
}

/**
 * Find an existing check run for this app on the given commit.
 */
async function findExistingCheckRun(
  token: string, owner: string, repo: string, headSha: string
): Promise<number | null> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits/${headSha}/check-runs?check_name=${encodeURIComponent(CHECK_NAME)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  return data.check_runs?.[0]?.id || null;
}
