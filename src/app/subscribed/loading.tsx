import { TableSkeleton } from '@/components/LoadingSkeleton';

export default function SubscribedLoading() {
  return (
    <div className="app-content">
      <div className="skeleton-toolbar">
        <div className="skeleton" style={{ width: 180, height: 32 }} />
      </div>
      <TableSkeleton rows={4} />
    </div>
  );
}
