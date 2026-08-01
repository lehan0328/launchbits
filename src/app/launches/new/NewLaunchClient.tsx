'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import LaunchForm, { INITIAL_FORM_DATA } from '@/components/LaunchForm';
import { createLaunchAction, submitForReviewAction } from '@/app/actions';
import type { ReviewDefinition } from '@/lib/types';

interface NewLaunchClientProps {
  reviewDefinitions: ReviewDefinition[];
}

export default function NewLaunchClient({ reviewDefinitions }: NewLaunchClientProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  return (
    <LaunchForm
      title="Create Launch Card"
      initialData={INITIAL_FORM_DATA}
      reviewDefinitions={reviewDefinitions}
      actions={({ formData }) => (
        <>
          <button className="btn btn-ghost" onClick={() => router.push('/')}>Cancel</button>
          <button
            className="btn btn-secondary"
            disabled={submitting}
            onClick={async () => {
              if (!formData.name.trim()) {
                alert('Please enter a feature name.');
                return;
              }
              setSubmitting(true);
              try {
                await createLaunchAction(formData);
              } catch (e) {
                console.error(e);
                setSubmitting(false);
              }
            }}
          >
            {submitting ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            className="btn btn-primary"
            disabled={submitting}
            onClick={async () => {
              if (!formData.name.trim()) {
                alert('Please enter a feature name.');
                return;
              }
              setSubmitting(true);
              try {
                await createLaunchAction(formData);
              } catch (e) {
                console.error(e);
                setSubmitting(false);
              }
            }}
          >
            {submitting ? 'Submitting...' : 'Request Review'}
          </button>
        </>
      )}
    />
  );
}
