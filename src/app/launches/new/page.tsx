'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { QUESTIONNAIRE_SECTIONS, isSectionVisible } from '@/lib/questionnaire';
import { calculateRiskLevel } from '@/lib/risk-calculator';
import { evaluateRequiredReviews, DEFAULT_RULES } from '@/lib/rules-engine';
import { store } from '@/lib/store';
import type { LaunchFormData } from '@/lib/types';

const INITIAL_FORM_DATA: LaunchFormData = {
  name: '',
  description: '',
  target_date: '',
  hard_deadline: false,
  github_repo: '',
  q_target_population: [],
  q_data_classes: [],
  q_processing_purpose: [],
  q_consent_mechanism: null,
  q_retention_ttl: null,
  q_deletion_controls: null,
  q_external_sharing: [],
  q_ai_model_scope: null,
  q_automated_decisions: false,
  q_network_exposure: [],
  q_auth_secrets: [],
  q_input_parsing: [],
};

const RISK_COLORS: Record<string, string> = {
  LOW: 'var(--color-green)',
  MEDIUM: 'var(--color-orange)',
  HIGH: 'var(--color-red)',
};

export default function NewLaunchPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<LaunchFormData>(INITIAL_FORM_DATA);

  const riskLevel = useMemo(() => calculateRiskLevel(formData), [formData]);

  const reviewDefinitions = store.getReviewDefinitions();
  const requiredReviews = useMemo(
    () => evaluateRequiredReviews(formData, riskLevel, reviewDefinitions, DEFAULT_RULES),
    [formData, riskLevel, reviewDefinitions],
  );

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

  const handleSubmit = (asDraft: boolean) => {
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
          status: review.defaultStatus,
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
          review_type: review.reviewType,
        });
      }
      store.updateLaunch(launch.id, { status: 'IN_REVIEW' });
      store.addEvent(launch.id, 1, 'SUBMITTED_FOR_REVIEW', 'user-001', {
        new_val: { reviews: requiredReviews.map(r => r.label) },
      });
    }
    router.push(`/launches/${launch.id}`);
  };

  const visibleSections = QUESTIONNAIRE_SECTIONS.filter(s =>
    isSectionVisible(s, { ...formData }),
  );

  return (
    <>
      <header className="app-header">
        <span className="app-header-title">Create Launch Card</span>
      </header>

      <div className="app-content" style={{ maxWidth: 600 }}>
        {/* Core Fields */}
        <div className="card mb-6" style={{ padding: 24 }}>
          <div className="form-group">
            <label className="form-label">Feature Name <span className="form-required">*</span></label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., AI Product Recommendations"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              placeholder="Brief description of the feature..."
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
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
              />
            </div>
          </div>
          <label className="choice-item" style={{ maxWidth: 280, marginTop: 4 }}>
            <input
              type="checkbox"
              checked={formData.hard_deadline}
              onChange={() => setFormData(prev => ({ ...prev, hard_deadline: !prev.hard_deadline }))}
            />
            <div>
              <div className="choice-label">Hard deadline</div>
              <div className="choice-description">Date cannot be moved</div>
            </div>
          </label>
        </div>

        {/* Questionnaire Sections */}
        {visibleSections.map(section => (
          <div key={section.id} className="card mb-4 fade-in" style={{ padding: 24 }}>
            <div className="section-header" style={{ marginTop: 0, paddingTop: 0 }}>
              <span className="section-icon">{section.icon}</span>
              <span className="section-title">{section.title}</span>
            </div>
            {section.questions.map(question => (
              <div key={question.id} className="form-group">
                <label className="form-label">
                  {question.prompt}
                  {question.required && <span className="form-required"> *</span>}
                </label>
                {question.helpText && <div className="form-hint">{question.helpText}</div>}

                {question.type === 'MULTI_SELECT' && question.choices && (
                  <div className="choice-group mt-2">
                    {question.choices.map(choice => {
                      const selected = ((formData[question.fieldName as keyof LaunchFormData] as string[]) || []).includes(choice.id);
                      return (
                        <label key={choice.id} className={`choice-item ${selected ? 'selected' : ''}`}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => handleMultiSelect(question.fieldName as keyof LaunchFormData, choice.id)}
                          />
                          <div>
                            <div className="choice-label">{choice.label}</div>
                            {choice.description && <div className="choice-description">{choice.description}</div>}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {question.type === 'SINGLE_SELECT' && question.choices && (
                  <div className="choice-group mt-2">
                    {question.choices.map(choice => {
                      const selected = formData[question.fieldName as keyof LaunchFormData] === choice.id;
                      return (
                        <label key={choice.id} className={`choice-item ${selected ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            name={question.fieldName}
                            checked={selected}
                            onChange={() => handleSingleSelect(question.fieldName as keyof LaunchFormData, choice.id)}
                          />
                          <div>
                            <div className="choice-label">{choice.label}</div>
                            {choice.description && <div className="choice-description">{choice.description}</div>}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {question.type === 'BOOLEAN' && (
                  <label className={`choice-item ${formData[question.fieldName as keyof LaunchFormData] ? 'selected' : ''}`} style={{ maxWidth: 300 }}>
                    <input
                      type="checkbox"
                      checked={!!formData[question.fieldName as keyof LaunchFormData]}
                      onChange={() => handleBoolean(question.fieldName as keyof LaunchFormData)}
                    />
                    <div><div className="choice-label">Yes</div></div>
                  </label>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Risk Assessment */}
        <div className="risk-indicator mb-6">
          <div className={`risk-dot ${riskLevel.toLowerCase()}`} />
          <div style={{ flex: 1 }}>
            <div className="risk-level-text" style={{ color: RISK_COLORS[riskLevel] }}>
              {riskLevel} RISK
            </div>
            <div className="text-secondary text-xs" style={{ marginTop: 4 }}>
              {requiredReviews.length > 0
                ? `${requiredReviews.length} review${requiredReviews.length > 1 ? 's' : ''} required: ${requiredReviews.map(r => r.label).join(', ')}`
                : 'No reviews required.'}
            </div>
            {requiredReviews.filter(r => r.defaultStatus === 'PENDING_REVIEW').length > 0 && (
              <div className="text-muted text-xs" style={{ marginTop: 2 }}>
                Estimated review time: {Math.max(...requiredReviews.map(r => r.sloDays))} business days
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={() => router.push('/')}>Cancel</button>
          <button className="btn btn-secondary" onClick={() => handleSubmit(true)}>Save Draft</button>
          <button className="btn btn-primary" onClick={() => handleSubmit(false)}>Request Review</button>
        </div>
      </div>
    </>
  );
}
