'use client';

import { useState, useMemo, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { QUESTIONNAIRE_SECTIONS, isSectionVisible } from '@/lib/questionnaire';
import { calculateRiskLevel } from '@/lib/risk-calculator';
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

const RISK_COLORS: Record<string, string> = {
  LOW: 'var(--color-green)',
  MEDIUM: 'var(--color-orange)',
  HIGH: 'var(--color-red)',
};

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

  return <EditLaunchForm launch={launch} router={router} />;
}

function EditLaunchForm({ launch, router }: { launch: Launch; router: ReturnType<typeof useRouter> }) {
  const [formData, setFormData] = useState<LaunchFormData>(() => launchToFormData(launch));
  const [saving, setSaving] = useState(false);

  const riskLevel = useMemo(() => calculateRiskLevel(formData), [formData]);

  const canEdit = launch.status === 'DRAFT' || launch.status === 'IN_REVIEW';

  const handleMultiSelect = useCallback((fieldName: keyof LaunchFormData, choiceId: string) => {
    setFormData(prev => {
      const current = (prev[fieldName] as string[]) || [];
      const updated = current.includes(choiceId)
        ? current.filter(v => v !== choiceId)
        : [...current, choiceId];
      return { ...prev, [fieldName]: updated };
    });
  }, []);

  const handleSingleSelect = useCallback((fieldName: keyof LaunchFormData, choiceId: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: prev[fieldName] === choiceId ? null : choiceId,
    }));
  }, []);

  const handleBoolean = useCallback((fieldName: keyof LaunchFormData) => {
    setFormData(prev => ({ ...prev, [fieldName]: !prev[fieldName] }));
  }, []);

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('Please enter a feature name.');
      return;
    }

    setSaving(true);

    // Build the update payload — only changed fields
    store.updateLaunch(launch.id, {
      name: formData.name,
      description: formData.description || null,
      target_date: formData.target_date || null,
      hard_deadline: formData.hard_deadline,
      risk_level: riskLevel,
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
  };

  const visibleSections = QUESTIONNAIRE_SECTIONS.filter(s =>
    isSectionVisible(s, { ...formData }),
  );

  return (
    <>
      <header className="app-header">
        <span className="app-header-title">Edit Launch — {launch.name}</span>
        {!canEdit && (
          <span className="status-tag" style={{
            background: 'var(--status-warning-bg)',
            color: 'var(--status-warning-text)',
            border: '1px solid var(--status-warning-border)',
            marginLeft: 12,
          }}>
            Read-only (status: {launch.status})
          </span>
        )}
      </header>

      <div className="app-content" style={{ maxWidth: 600 }}>
        {/* Core Fields */}
        <div className="card mb-6" style={{ padding: 24 }}>
          <div className="form-group">
            <label className="form-label">Feature Name <span className="form-required">*</span></label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={!canEdit}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={!canEdit}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Target Date</label>
              <input
                type="date"
                className="form-input"
                value={formData.target_date}
                onChange={e => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
                disabled={!canEdit}
              />
            </div>
            <div className="form-group">
              <label className="form-label">GitHub Repo</label>
              <input
                type="text"
                className="form-input"
                placeholder="org/repo"
                value={formData.github_repo}
                onChange={e => setFormData(prev => ({ ...prev, github_repo: e.target.value }))}
                disabled={!canEdit}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-chip-label">
              <input
                type="checkbox"
                checked={formData.hard_deadline}
                onChange={() => handleBoolean('hard_deadline')}
                disabled={!canEdit}
              />
              Hard deadline (cannot slip)
            </label>
          </div>
        </div>

        {/* Live Risk Indicator */}
        <div className="card mb-6" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Calculated Risk:</span>
          <span style={{ fontWeight: 600, color: RISK_COLORS[riskLevel] }}>{riskLevel}</span>
          {riskLevel !== launch.risk_level && (
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              (was {launch.risk_level})
            </span>
          )}
        </div>

        {/* Questionnaire Sections */}
        {visibleSections.map(section => (
          <div key={section.id} className="card mb-6" style={{ padding: 24 }}>
            <h3 className="page-subtitle" style={{ marginBottom: 4 }}>{section.title}</h3>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)', marginBottom: 16 }}>
              {section.icon} {section.title}
            </p>

            {section.questions.map(q => (
              <div key={q.id} className="form-group">
                <label className="form-label">{q.prompt}</label>
                {q.type === 'MULTI_SELECT' && q.choices?.map(c => (
                  <label key={c.id} className="form-chip-label">
                    <input
                      type="checkbox"
                      checked={(formData[q.fieldName as keyof LaunchFormData] as string[])?.includes(c.id) ?? false}
                      onChange={() => handleMultiSelect(q.fieldName as keyof LaunchFormData, c.id)}
                      disabled={!canEdit}
                    />
                    {c.label}
                  </label>
                ))}
                {q.type === 'SINGLE_SELECT' && q.choices?.map(c => (
                  <label key={c.id} className="form-chip-label">
                    <input
                      type="radio"
                      name={q.id}
                      checked={formData[q.fieldName as keyof LaunchFormData] === c.id}
                      onChange={() => handleSingleSelect(q.fieldName as keyof LaunchFormData, c.id)}
                      disabled={!canEdit}
                    />
                    {c.label}
                  </label>
                ))}
                {q.type === 'BOOLEAN' && (
                  <label className="form-chip-label">
                    <input
                      type="checkbox"
                      checked={!!formData[q.fieldName as keyof LaunchFormData]}
                      onChange={() => handleBoolean(q.fieldName as keyof LaunchFormData)}
                      disabled={!canEdit}
                    />
                    {q.prompt}
                  </label>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 40 }}>
          <button className="btn" onClick={() => router.push(`/launches/${launch.id}`)}>
            Cancel
          </button>
          {canEdit && (
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
