import { SkeletonBlock } from '@/components/LoadingSkeleton';

export default function SettingsLoading() {
  return (
    <div className="app-content">
      <div style={{ maxWidth: 700 }}>
        <SkeletonBlock width="200px" height={24} />
        <div className="skeleton-mt-lg">
          <SkeletonBlock width="100%" height={120} />
        </div>
        <div className="skeleton-mt-lg">
          <SkeletonBlock width="100%" height={200} />
        </div>
      </div>
    </div>
  );
}
