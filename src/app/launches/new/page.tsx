'use client';

import { useRouter } from 'next/navigation';
import LaunchForm, { INITIAL_FORM_DATA } from '@/components/LaunchForm';
import { store } from '@/lib/store';
import type { ReviewStatus, ReviewType } from '@/lib/types';

export default function NewLaunchPage() {
  const router = useRouter();

  return (
    <LaunchForm
      title="Create Launch Card"
      initialData={INITIAL_FORM_DATA}
      actions={({ formData, riskLevel, requiredReviews }) => (
        <>
          <button className="btn btn-ghost" onClick={() => router.push('/')}>Cancel</button>
          <button
            className="btn btn-secondary"
            onClick={() => handleSubmit(formData, riskLevel, requiredReviews, router, true)}
          >
            Save Draft
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleSubmit(formData, riskLevel, requiredReviews, router, false)}
          >
            Request Review
          </button>
        </>
      )}
    />
  );
}

function handleSubmit(
  formData: Parameters<typeof store.createLaunch>[0] & { name: string; description: string; target_date: string; github_repo: string; hard_deadline: boolean },
  riskLevel: string,
  requiredReviews: { definitionId: string; label: string; reviewType: string; sloDays: number; defaultStatus: string; triggerReason: string; fyiAllowed: boolean; ownerApprovalDisallowed: boolean; accessRestricted: boolean }[],
  router: ReturnType<typeof useRouter>,
  asDraft: boolean,
) {
  if (!formData.name.trim()) {
    alert('Please enter a feature name.');
    return;
  }

  const launch = store.createLaunch({
    name: formData.name,
    description: formData.description || undefined,
    target_date: formData.target_date || undefined,
    hard_deadline: formData.hard_deadline,
    risk_level: riskLevel,
    github_repo: formData.github_repo || undefined,
    q_data_classes: formData.q_data_classes,
    q_target_population: formData.q_target_population,
    q_processing_purpose: formData.q_processing_purpose,
    q_consent_mechanism: formData.q_consent_mechanism ?? undefined,
    q_retention_ttl: formData.q_retention_ttl ?? undefined,
    q_deletion_controls: formData.q_deletion_controls ?? undefined,
    q_external_sharing: formData.q_external_sharing,
    q_ai_model_scope: formData.q_ai_model_scope ?? undefined,
    q_automated_decisions: formData.q_automated_decisions,
    q_network_exposure: formData.q_network_exposure,
    q_auth_secrets: formData.q_auth_secrets,
    q_input_parsing: formData.q_input_parsing,
  } as Parameters<typeof store.createLaunch>[0]);

  if (!asDraft) {
    for (const review of requiredReviews) {
      store.addReview({
        id: `rev-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        launch_id: launch.id,
        review_definition_id: review.definitionId,
        status: review.defaultStatus as ReviewStatus,
        notes: null,
        reviewed_by: null,
        reviewed_by_name: null,
        reviewed_at: null,
        slo_started_at: review.defaultStatus === 'PENDING_REVIEW' ? new Date().toISOString() : null,
        slo_due_at: review.defaultStatus === 'PENDING_REVIEW'
          ? new Date(Date.now() + review.sloDays * 86400000).toISOString()
          : null,
        slo_breached: false,
        trigger_reason: review.triggerReason,
        fyi_allowed: review.fyiAllowed,
        owner_approval_disallowed: review.ownerApprovalDisallowed,
        access_restricted: review.accessRestricted,
        label: review.label,
        review_type: review.reviewType as ReviewType,
      });
    }
    store.updateLaunch(launch.id, { status: 'IN_REVIEW' });
    store.addEvent(launch.id, 1, 'SUBMITTED_FOR_REVIEW', 'user-001', {
      new_val: { reviews: requiredReviews.map(r => r.label) },
    });
  }
  router.push(`/launches/${launch.id}`);
}
