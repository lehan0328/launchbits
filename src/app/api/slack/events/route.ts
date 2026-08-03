// ============================================================================
// SLACK EVENTS API — Handles url_verification and future event subscriptions
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifySlackSignature } from '@/lib/slack';
import { rateLimitWebhook } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limit: 100 req/min per IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const { allowed, headers } = rateLimitWebhook(ip, 'slack-events');
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
  }


  const body = await request.text();
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  if (!signingSecret) {
    return NextResponse.json({ error: 'Slack not configured' }, { status: 500 });
  }

  // Verify request signature (skip for url_verification challenge)
  const signature = request.headers.get('x-slack-signature') || '';
  const timestamp = request.headers.get('x-slack-request-timestamp') || '';

  const payload = JSON.parse(body) as { type: string; challenge?: string };

  // Slack sends url_verification during app setup — respond with challenge
  if (payload.type === 'url_verification') {
    return NextResponse.json({ challenge: payload.challenge });
  }

  // Validate signature for all other events
  if (!verifySlackSignature(signingSecret, signature, timestamp, body)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Handle events (future: app_mention, message, etc.)
  // For now, just acknowledge receipt
  return NextResponse.json({ ok: true });
}
