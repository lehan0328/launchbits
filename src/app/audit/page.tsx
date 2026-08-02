import { getCurrentUser, getAllEvents, getLaunches } from '@/server/db';
import { redirect } from 'next/navigation';
import AuditLogClient from './AuditLogClient';

export default async function AuditLogPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [events, launches] = await Promise.all([
    getAllEvents(user.org_id),
    getLaunches(user.org_id),
  ]);

  // Build launch name lookup
  const launchNames: Record<string, string> = {};
  for (const l of launches) launchNames[l.id] = l.name;

  return <AuditLogClient events={events} launchNames={launchNames} />;
}
