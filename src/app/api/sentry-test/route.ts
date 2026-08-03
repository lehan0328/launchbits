/**
 * Sentry Test Route — triggers a test error to verify Sentry is working.
 * 
 * Usage: visit https://www.launchbits.dev/api/sentry-test
 * Then check https://launchbits.sentry.io for the error.
 * 
 * DELETE THIS FILE after verifying Sentry works.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  throw new Error('[Sentry Test] This is a test error to verify Sentry integration');
  return NextResponse.json({ ok: true }); // never reached
}
