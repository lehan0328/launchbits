/**
 * GitHub API Client
 *
 * Pure fetch-based wrapper — no Octokit SDK. Handles:
 * - GitHub App JWT generation (for installation token exchange)
 * - Installation token exchange
 * - Check Runs API (create, update)
 * - Webhook signature verification
 */

import * as crypto from 'crypto';

// ============================================================================
// Auth: GitHub App JWT + Installation Tokens
// ============================================================================

/**
 * Generate a JWT for the GitHub App (used to exchange for installation tokens).
 * GitHub App JWTs are short-lived (10 min max).
 */
function generateAppJwt(): string {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!appId || !privateKey) {
    throw new Error('Missing GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iat: now - 60,       // issued at (60s in past for clock drift)
    exp: now + 600,      // expires in 10 minutes
    iss: appId,
  })).toString('base64url');

  const signature = crypto
    .createSign('RSA-SHA256')
    .update(`${header}.${payload}`)
    .sign(privateKey, 'base64url');

  return `${header}.${payload}.${signature}`;
}

/**
 * Exchange a GitHub App JWT for an installation-scoped access token.
 * These tokens last 1 hour and are scoped to a specific installation.
 */
export async function getInstallationToken(installationId: number): Promise<string> {
  const jwt = generateAppJwt();
  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    console.error('[GitHub] Failed to get installation token:', res.status, body);
    throw new Error(`GitHub installation token error: ${res.status}`);
  }

  const data = await res.json();
  return data.token;
}

// ============================================================================
// Check Runs API
// ============================================================================

export type CheckStatus = 'queued' | 'in_progress' | 'completed';
export type CheckConclusion = 'success' | 'failure' | 'neutral' | 'action_required';

interface CheckRunParams {
  token: string;
  owner: string;
  repo: string;
  headSha: string;
  name: string;
  status: CheckStatus;
  conclusion?: CheckConclusion;
  title: string;
  summary: string;
  detailsUrl?: string;
}

/**
 * Create a new check run on a commit.
 */
export async function createCheckRun(params: CheckRunParams): Promise<{ id: number }> {
  const { token, owner, repo, headSha, name, status, conclusion, title, summary, detailsUrl } = params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: Record<string, any> = {
    name,
    head_sha: headSha,
    status,
    output: { title, summary },
  };

  if (conclusion) body.conclusion = conclusion;
  if (detailsUrl) body.details_url = detailsUrl;

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/check-runs`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error('[GitHub] Failed to create check run:', res.status, text);
    throw new Error(`GitHub check run create error: ${res.status}`);
  }

  return res.json();
}

/**
 * Update an existing check run.
 */
export async function updateCheckRun(params: CheckRunParams & { checkRunId: number }): Promise<void> {
  const { token, owner, repo, checkRunId, status, conclusion, title, summary, detailsUrl } = params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: Record<string, any> = {
    status,
    output: { title, summary },
  };

  if (conclusion) body.conclusion = conclusion;
  if (detailsUrl) body.details_url = detailsUrl;

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/check-runs/${checkRunId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error('[GitHub] Failed to update check run:', res.status, text);
  }
}

// ============================================================================
// Webhook Signature Verification
// ============================================================================

/**
 * Verify GitHub webhook signature (HMAC-SHA256).
 */
export function verifyGitHubSignature(
  payload: string,
  signature: string | null
): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse "owner/repo" from a full GitHub URL or shorthand.
 * Handles: "https://github.com/org/repo", "org/repo", "https://github.com/org/repo.git"
 */
export function parseOwnerRepo(input: string): { owner: string; repo: string } | null {
  // Try URL format
  const urlMatch = input.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };

  // Try shorthand "owner/repo"
  const parts = input.split('/');
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { owner: parts[0], repo: parts[1] };
  }

  return null;
}
