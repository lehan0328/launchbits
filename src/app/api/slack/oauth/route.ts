// ============================================================================
// SLACK OAUTH CALLBACK — Exchanges code for bot token, stores encrypted on org
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/server/admin';
import { encrypt } from '@/server/crypto';
import { getCurrentUser } from '@/server/db';
import { rateLimitAuth } from '@/lib/rate-limit';

interface SlackOAuthResponse {
  ok: boolean;
  error?: string;
  access_token?: string;
  team?: { id: string; name: string };
  bot_user_id?: string;
}

export async function GET(request: NextRequest) {
  // Rate limit: 10 req/min per IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const { allowed, headers } = rateLimitAuth(ip);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
  }

  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  // User denied the OAuth request
  if (error) {
    return NextResponse.redirect(new URL('/settings?slack=cancelled', request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/settings?slack=error', request.url));
  }

  // Verify the user is authenticated
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Exchange code for token
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('SLACK_CLIENT_ID or SLACK_CLIENT_SECRET not configured');
    return NextResponse.redirect(new URL('/settings?slack=error', request.url));
  }

  const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const tokenData = await tokenRes.json() as SlackOAuthResponse;

  if (!tokenData.ok || !tokenData.access_token || !tokenData.team) {
    console.error('Slack OAuth error:', tokenData.error);
    return NextResponse.redirect(new URL('/settings?slack=error', request.url));
  }

  // Encrypt the token before storing
  const encryptedToken = encrypt(tokenData.access_token);

  // Store on the organization
  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.redirect(new URL('/settings?slack=error', request.url));
  }

  const { error: updateError } = await supabase.from('organizations')
    .update({
      slack_bot_token_encrypted: encryptedToken,
      slack_team_id: tokenData.team.id,
    })
    .eq('id', user.org_id);

  if (updateError) {
    console.error('Failed to save Slack token:', updateError);
    return NextResponse.redirect(new URL('/settings?slack=error', request.url));
  }

  return NextResponse.redirect(new URL('/settings?slack=connected', request.url));
}
