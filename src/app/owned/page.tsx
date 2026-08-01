import { DataTable } from '@/components/DataTable';
import { getCurrentUser, getLaunches } from '@/lib/db';
import { getOwnedColumns } from '@/lib/columns';
import { redirect } from 'next/navigation';

export default async function OwnedPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const launches = await getLaunches(user.org_id);

  return (
    <div className="app-content">
      <DataTable
        data={launches}
        columns={getOwnedColumns()}
      />

      <div className="table-footer">
        Showing {launches.length} of {launches.length}
      </div>
    </div>
  );
}
