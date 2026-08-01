'use client';

import { useState } from 'react';
import { DataTable, TableToolbar } from '@/components/DataTable';
import { store } from '@/lib/store';
import { getOwnedColumns } from '@/lib/columns';

export default function OwnedPage() {
  const launches = store.getLaunches();
  const [sortAsc, setSortAsc] = useState(false);

  return (
    <div className="app-content">
      <TableToolbar
        sortAsc={sortAsc}
        onToggleSort={() => setSortAsc(!sortAsc)}
      />

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
