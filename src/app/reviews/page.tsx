import { getCurrentUser, getPendingReviewsForUser } from '@/server/db';
import { redirect } from 'next/navigation';
import ReviewsClient from './ReviewsClient';

export default async function ReviewsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const pendingReviews = await getPendingReviewsForUser(user.org_id, user.id);

  return <ReviewsClient pendingReviews={pendingReviews} />;
}
