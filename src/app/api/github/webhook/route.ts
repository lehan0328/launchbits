/**
 * GitHub Webhook Handler
 *
 * Handles incoming GitHub webhooks:
 * - `installation.created` — store installation ID on org
 * - `pull_request.opened` / `pull_request.synchronize` — create/update check runs
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyGitHubSignature } from '@/lib/github';
import { createAdminClient } from '@/server/admin';
import { syncCheckRun } from '@/server/github-checks';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  const event = request.headers.get('x-github-event');

  // Verify signature
  if (!verifyGitHubSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(body);

  // ── Installation Events ──────────────────────────────────────────────
  if (event === 'installation' && payload.action === 'created') {
    return handleInstallationCreated(payload);
  }

  // ── Pull Request Events ──────────────────────────────────────────────
  if (event === 'pull_request') {
    return handlePullRequest(payload);
  }

  // ── Check Suite Events ───────────────────────────────────────────────
  if (event === 'check_suite' && payload.action === 'requested') {
    return handleCheckSuiteRequested(payload);
  }

  return NextResponse.json({ ok: true });
}

/**
 * When a user installs the GitHub App on their org/repo, we don't know
 * which Launchbits org to associate it with yet. The user completes the
 * flow via our install callback (/api/github/install) which reads the
 * installation_id from the redirect params.
 */
async function handleInstallationCreated(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any
) {
  console.log(`[GitHub] App installed: installation ${payload.installation.id} by ${payload.sender.login}`);
  return NextResponse.json({ ok: true });
}

/**
 * When a PR is opened or updated, check if any launch is linked to this
 * repo + PR number, and if so, sync the check run.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePullRequest(payload: any) {
  if (!['opened', 'synchronize', 'reopened'].includes(payload.action)) {
    return NextResponse.json({ ok: true });
  }

  const repo = payload.repository.full_name; // "owner/repo"
  const prNumber = payload.pull_request.number;

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ ok: true });

  // Find launches linked to this PR
  const { data: launches } = await supabase.from('launches')
    .select('id')
    .or(`github_repo.eq.${repo},github_repo.eq.https://github.com/${repo}`)
    .eq('github_pr_number', prNumber);

  if (launches && launches.length > 0) {
    for (const launch of launches) {
      void syncCheckRun(launch.id);
    }
  }

  return NextResponse.json({ ok: true, matched: launches?.length || 0 });
}

/**
 * When GitHub requests a check suite (e.g., on new push), find linked
 * launches and sync their check runs.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCheckSuiteRequested(payload: any) {
  const repo = payload.repository.full_name;
  const prs = payload.check_suite.pull_requests || [];

  if (prs.length === 0) return NextResponse.json({ ok: true });

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ ok: true });

  for (const pr of prs) {
    const { data: launches } = await supabase.from('launches')
      .select('id')
      .or(`github_repo.eq.${repo},github_repo.eq.https://github.com/${repo}`)
      .eq('github_pr_number', pr.number);

    if (launches) {
      for (const launch of launches) {
        void syncCheckRun(launch.id);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
