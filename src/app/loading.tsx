import { SectionSkeleton, StatCardSkeleton } from '@/components/LoadingSkeleton';

export default function Loading() {
  return (
    <div className="app-content">
      {/* Stat cards skeleton */}
      <div className="dashboard-stats">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Owned by you section */}
      <SectionSkeleton rows={4} />

      {/* Pending your approval section */}
      <div className="skeleton-mt-lg">
        <SectionSkeleton rows={2} />
      </div>
    </div>
  );
}
