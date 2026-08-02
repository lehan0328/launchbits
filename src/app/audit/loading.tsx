import { TableSkeleton } from '@/components/LoadingSkeleton';

export default function AuditLoading() {
  return (
    <div className="app-content">
      <div className="skeleton-toolbar">
        <div className="skeleton" style={{ width: 200, height: 32 }} />
        <div className="skeleton" style={{ width: 140, height: 32 }} />
      </div>
      <TableSkeleton rows={8} />
    </div>
  );
}
