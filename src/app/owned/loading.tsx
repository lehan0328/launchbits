import { SectionSkeleton } from '@/components/LoadingSkeleton';

export default function OwnedLoading() {
  return (
    <div className="app-content">
      <SectionSkeleton rows={5} />
    </div>
  );
}
