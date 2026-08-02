// ============================================================================
// LOADING SKELETON — Reusable skeleton components for loading states
// Uses CSS classes from globals.css (no inline styles)
// ============================================================================

/**
 * Animated skeleton block — single rectangular placeholder.
 */
export function SkeletonBlock({
  width,
  height = 16,
  className = '',
}: {
  width?: string;
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: width || '100%',
        height,
      }}
    />
  );
}

/**
 * Table skeleton — mimics a DataTable with header + rows.
 */
export function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="skeleton-table">
      {/* Header row */}
      <div className="skeleton-table-header">
        <SkeletonBlock width="5%" height={16} />
        <SkeletonBlock width="8%" height={16} />
        <SkeletonBlock width="25%" height={16} />
        <SkeletonBlock width="12%" height={16} />
        <SkeletonBlock width="10%" height={16} />
        <SkeletonBlock width="15%" height={16} />
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-table-row" style={{ opacity: 1 - i * 0.15 }}>
          <SkeletonBlock width="5%" height={14} />
          <SkeletonBlock width="8%" height={14} />
          <SkeletonBlock width="30%" height={14} />
          <SkeletonBlock width="10%" height={14} />
          <SkeletonBlock width="8%" height={20} />
          <SkeletonBlock width="12%" height={14} />
        </div>
      ))}
    </div>
  );
}

/**
 * Section skeleton — mimics a SectionHeader + table.
 */
export function SectionSkeleton({
  rows = 4,
}: {
  rows?: number;
}) {
  return (
    <div className="skeleton-section">
      <div className="skeleton-section-header">
        <SkeletonBlock width="180px" height={20} />
        <SkeletonBlock width="100px" height={14} />
      </div>
      <TableSkeleton rows={rows} />
    </div>
  );
}

/**
 * Stat card skeleton — mimics a summary stat card.
 */
export function StatCardSkeleton() {
  return (
    <div className="card skeleton-stat-card">
      <SkeletonBlock width="60%" height={12} />
      <SkeletonBlock width="40%" height={28} className="skeleton-mt" />
    </div>
  );
}

/**
 * Detail page skeleton — mimics a launch detail page.
 */
export function DetailSkeleton() {
  return (
    <div className="app-content">
      {/* Title area */}
      <div className="skeleton-detail-header">
        <SkeletonBlock width="50%" height={24} />
        <SkeletonBlock width="30%" height={14} className="skeleton-mt" />
      </div>
      {/* Banner */}
      <SkeletonBlock width="100%" height={56} className="skeleton-mt-lg" />
      {/* Review cards */}
      <div className="skeleton-detail-grid skeleton-mt-lg">
        <div>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="card skeleton-review-card">
              <SkeletonBlock width="40%" height={16} />
              <SkeletonBlock width="60%" height={14} className="skeleton-mt" />
              <SkeletonBlock width="25%" height={24} className="skeleton-mt" />
            </div>
          ))}
        </div>
        <div>
          <div className="card skeleton-sidebar-card">
            <SkeletonBlock width="50%" height={14} />
            <SkeletonBlock width="80%" height={14} className="skeleton-mt" />
            <SkeletonBlock width="60%" height={14} className="skeleton-mt" />
          </div>
        </div>
      </div>
    </div>
  );
}
