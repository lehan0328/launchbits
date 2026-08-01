'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import LaunchForm from '@/components/LaunchForm';
import { store } from '@/lib/store';
import type { LaunchFormData, Launch } from '@/lib/types';

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

export default function EditLaunchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const launch = store.getLaunchById(id);

  if (!launch) {
    return (
      <div className="app-content" style={{ textAlign: 'center', padding: 80 }}>
        <h2 style={{ color: 'var(--text-secondary)' }}>Launch not found</h2>
      </div>
    );
  }

  const canEdit = launch.status === 'DRAFT' || launch.status === 'IN_REVIEW';

  return (
    <LaunchForm
      title={`Edit Launch — ${launch.name}`}
      initialData={launchToFormData(launch)}
      disabled={!canEdit}
      previousRiskLevel={launch.risk_level}
      headerExtra={
        !canEdit ? (
          <span className="status-tag" style={{
            background: 'var(--status-warning-bg)',
            color: 'var(--status-warning-text)',
            border: '1px solid var(--status-warning-border)',
            marginLeft: 12,
          }}>
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
              onClick={() => handleSave(launch, formData, router)}
            >
              Save Changes
            </button>
          )}
        </>
      )}
    />
  );
}

function handleSave(
  launch: Launch,
  formData: LaunchFormData,
  router: ReturnType<typeof useRouter>,
) {
  if (!formData.name.trim()) {
    alert('Please enter a feature name.');
    return;
  }

  store.updateLaunch(launch.id, {
    name: formData.name,
    description: formData.description || null,
    target_date: formData.target_date || null,
    hard_deadline: formData.hard_deadline,
    github_repo: formData.github_repo || null,
    q_data_classes: formData.q_data_classes,
    q_target_population: formData.q_target_population,
    q_processing_purpose: formData.q_processing_purpose,
    q_consent_mechanism: formData.q_consent_mechanism,
    q_retention_ttl: formData.q_retention_ttl,
    q_deletion_controls: formData.q_deletion_controls,
    q_external_sharing: formData.q_external_sharing,
    q_ai_model_scope: formData.q_ai_model_scope,
    q_automated_decisions: formData.q_automated_decisions,
    q_network_exposure: formData.q_network_exposure,
    q_auth_secrets: formData.q_auth_secrets,
    q_input_parsing: formData.q_input_parsing,
  });

  store.addEvent(launch.id, launch.version + 1, 'LAUNCH_EDITED', 'user-001', {
    notes: 'Launch card updated.',
  });

  router.push(`/launches/${launch.id}`);
}
