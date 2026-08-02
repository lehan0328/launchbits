import { getCurrentUser, getOrganization, getReviewDefinitions } from '@/server/db';
import { redirect } from 'next/navigation';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [org, reviewDefs] = await Promise.all([
    getOrganization(user.org_id),
    getReviewDefinitions(user.org_id),
  ]);

  if (!org) redirect('/');

  return (
    <SettingsClient
      org={org}
      user={user}
      reviewDefs={reviewDefs}
    />
  );
}
