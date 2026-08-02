'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import LaunchForm from '@/components/LaunchForm';
import { updateLaunchAction } from '@/app/actions';
import type { LaunchFormData, Launch, ReviewDefinition } from '@/lib/types';

/**
 * Convert existing Launch data into the LaunchFormData shape for the form.
 */
function launchToFormData(launch: Launch): LaunchFormData {
  return {
    name: launch.name,
    description: launch.description || '',
    target_date: launch.target_date || '',
    hard_deadline: launch.hard_deadline,
    github_repo: launch.github_repo || '',
    q_data_classes: launch.q_data_classes,
    q_target_population: launch.q_target_population,
    q_processing_purpose: launch.q_processing_purpose,
    q_consent_mechanism: launch.q_consent_mechanism,
    q_retention_ttl: launch.q_retention_ttl,
    q_deletion_controls: launch.q_deletion_controls,
    q_external_sharing: launch.q_external_sharing,
    q_ai_model_scope: launch.q_ai_model_scope,
    q_automated_decisions: launch.q_automated_decisions,
    q_network_exposure: launch.q_network_exposure,
    q_auth_secrets: launch.q_auth_secrets,
    q_input_parsing: launch.q_input_parsing,
  };
}

interface EditLaunchClientProps {
  launch: Launch | null;
  reviewDefinitions: ReviewDefinition[];
}

export default function EditLaunchClient({ launch, reviewDefinitions }: EditLaunchClientProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  if (!launch) {
    return (
      <div className="app-content detail-empty-state">
        <h2 className="text-secondary">Launch not found</h2>
      </div>
    );
  }

  const canEdit = launch.status === 'DRAFT' || launch.status === 'IN_REVIEW';

  return (
    <LaunchForm
      title={`Edit Launch — ${launch.name}`}
      initialData={launchToFormData(launch)}
      reviewDefinitions={reviewDefinitions}
      disabled={!canEdit}
      previousRiskLevel={launch.risk_level}
      headerExtra={
        !canEdit ? (
          <span className="status-tag status-tag--warning">
            Read-only (status: {launch.status})
          </span>
        ) : undefined
      }
      actions={({ formData }) => (
        <>
          <button className="btn btn-ghost" onClick={() => router.push(`/launches/${launch.id}`)}>
            Cancel
          </button>
          {canEdit && (
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
                  await updateLaunchAction(launch.id, formData);
                } catch (e) {
                  console.error(e);
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </>
      )}
    />
  );
}
