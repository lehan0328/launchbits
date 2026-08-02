import { SectionSkeleton } from '@/components/LoadingSkeleton';

export default function ReviewsLoading() {
  return (
    <div className="app-content">
      <SectionSkeleton rows={3} />
    </div>
  );
}
