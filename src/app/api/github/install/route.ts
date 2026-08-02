/**
 * GitHub App Installation Callback
 *
 * After a user installs the GitHub App from Settings, GitHub redirects here
 * with `?installation_id=...&setup_action=install`. We store the installation
 * ID on the user's org and redirect back to /settings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/server/supabase';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const installationId = url.searchParams.get('installation_id');
  const setupAction = url.searchParams.get('setup_action');

  if (!installationId || setupAction !== 'install') {
    return NextResponse.redirect(new URL('/settings?github=error', request.url));
  }

  // Get current user to find their org
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return NextResponse.redirect(new URL('/settings?github=error', request.url));
  }

  // Look up user → org
  const { data: user } = await supabase
    .from('users')
    .select('org_id')
    .eq('email', authUser.email)
    .single();

  if (!user?.org_id) {
    return NextResponse.redirect(new URL('/settings?github=error', request.url));
  }

  // Store installation ID on org
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('organizations') as any)
    .update({ github_app_installation_id: parseInt(installationId, 10) })
    .eq('id', user.org_id);

  if (error) {
    console.error('[GitHub] Failed to store installation ID:', error);
    return NextResponse.redirect(new URL('/settings?github=error', request.url));
  }

  return NextResponse.redirect(new URL('/settings?github=connected', request.url));
}
