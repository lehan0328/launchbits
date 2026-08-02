'use client';

import { DataTable } from '@/components/DataTable';
import { getOwnedColumns } from '@/lib/columns';
import type { Launch } from '@/lib/types';

export default function OwnedClient({ launches }: { launches: Launch[] }) {
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
