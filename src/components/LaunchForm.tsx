'use client';

import { useState, useMemo, useCallback } from 'react';
import { QUESTIONNAIRE_SECTIONS, isSectionVisible } from '@/lib/questionnaire';
import { calculateRiskLevel } from '@/lib/risk-calculator';
import { evaluateRequiredReviews, DEFAULT_RULES } from '@/lib/rules-engine';
import type { LaunchFormData, ReviewDefinition } from '@/lib/types';

// ============================================================================
// Shared Launch Form — used by both /launches/new and /launches/[id]/edit
// Faithfully replicates Google's Ariane (launch.corp.google.com/create) UI:
//   • Full-width layout, no centered card
//   • Section header: ✓ circle icon + title + subtitle
//   • Two-column grid (left: core fields, right: config/summary)
//   • Labels above inputs (stacked)
//   • Underline-style inputs
//   • Left-aligned actions: "Save draft" + "→ Next"
//   • Info banner at bottom
// ============================================================================

export const INITIAL_FORM_DATA: LaunchFormData = {
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

interface LaunchFormProps {
  title: string;
  initialData: LaunchFormData;
  reviewDefinitions: ReviewDefinition[];
  disabled?: boolean;
  previousRiskLevel?: string;
  headerExtra?: React.ReactNode;
  actions: (props: {
    formData: LaunchFormData;
    riskLevel: string;
    requiredReviews: ReturnType<typeof evaluateRequiredReviews>;
  }) => React.ReactNode;
}

export default function LaunchForm({
  title,
  initialData,
  reviewDefinitions,
  disabled = false,
  previousRiskLevel,
  headerExtra,
  actions,
}: LaunchFormProps) {

  const [formData, setFormData] = useState<LaunchFormData>(initialData);

  const riskLevel = useMemo(() => calculateRiskLevel(formData), [formData]);
  const requiredReviews = useMemo(
    () => evaluateRequiredReviews(formData, riskLevel, reviewDefinitions, DEFAULT_RULES),
    [formData, riskLevel, reviewDefinitions],
  );

  const handleMultiSelect = useCallback((fieldName: keyof LaunchFormData, choiceId: string) => {
    if (disabled) return;
    setFormData(prev => {
      const current = (prev[fieldName] as string[]) || [];
      const updated = current.includes(choiceId)
        ? current.filter(v => v !== choiceId)
        : [...current, choiceId];
      return { ...prev, [fieldName]: updated };
    });
  }, [disabled]);

  const handleSingleSelect = useCallback((fieldName: keyof LaunchFormData, choiceId: string) => {
    if (disabled) return;
    setFormData(prev => ({
      ...prev,
      [fieldName]: prev[fieldName] === choiceId ? null : choiceId,
    }));
  }, [disabled]);

  const handleBoolean = useCallback((fieldName: keyof LaunchFormData) => {
    if (disabled) return;
    setFormData(prev => ({ ...prev, [fieldName]: !prev[fieldName] }));
  }, [disabled]);

  const visibleSections = QUESTIONNAIRE_SECTIONS.filter(s =>
    isSectionVisible(s, { ...formData }),
  );

  return (
    <>
      <header className="app-header">
        <span className="app-header-title">{title}</span>
        {headerExtra}
      </header>

      <div className="app-content">
        {/* ── Section: Launch Information ─────────────────────── */}
        <div className="ar-section">
          <div className="ar-section-header">
            <span className="ar-check-icon">✓</span>
            <div>
              <div className="ar-section-title">Launch information</div>
              <div className="ar-section-subtitle">Basic launch related information like name, description, templates</div>
            </div>
          </div>

          <div className="ar-section-body">
            <div className="ar-two-col">
              {/* Left column */}
              <div className="ar-col">
                <div className="ar-field">
                  <label className="ar-label">Launch name <span className="form-required">*</span></label>
                  <input
                    type="text"
                    className="ar-input"
                    placeholder="Launch title"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    disabled={disabled}
                  />
                </div>

                <div className="ar-field">
                  <label className="ar-label">Description <span className="form-required">*</span></label>
                  <textarea
                    className="ar-textarea"
                    placeholder="Describe what is being introduced in the launch. This can include information such as the expected impact, intended audience, or references to previous launches/stages."
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    disabled={disabled}
                    rows={5}
                  />
                </div>

                <div className="ar-field">
                  <label className="ar-label">Launch Date <span className="form-required">*</span></label>
                  <input
                    type="date"
                    className="ar-input ar-input-short"
                    placeholder="Pick a date"
                    value={formData.target_date}
                    onChange={e => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
                    disabled={disabled}
                  />
                </div>

                <div className="ar-field">
                  <label className="ar-label">GitHub Repo</label>
                  <input
                    type="text"
                    className="ar-input"
                    placeholder="org/repo"
                    value={formData.github_repo}
                    onChange={e => setFormData(prev => ({ ...prev, github_repo: e.target.value }))}
                    disabled={disabled}
                  />
                </div>

                <div className="ar-field">
                  <label className="ar-label">Hard deadline</label>
                  <label className="ar-checkbox-row">
                    <input
                      type="checkbox"
                      checked={formData.hard_deadline}
                      onChange={() => setFormData(prev => ({ ...prev, hard_deadline: !prev.hard_deadline }))}
                      disabled={disabled}
                    />
                    <span>This launch date is a hard deadline and cannot be moved.</span>
                  </label>
                </div>
              </div>

              {/* Right column — Risk & Review summary */}
              <div className="ar-col">
                <div className="ar-field">
                  <label className="ar-label">Risk assessment</label>
                  <div className="ar-risk-box">
                    <div className="ar-risk-header">
                      <span className={`risk-dot ${riskLevel.toLowerCase()}`} />
                      <span className="ar-risk-level" style={{ color: RISK_COLORS[riskLevel] }}>
                        {riskLevel}
                      </span>
                      {previousRiskLevel && riskLevel !== previousRiskLevel && (
                        <span className="text-secondary text-xs">(was {previousRiskLevel})</span>
                      )}
                    </div>
                    <p className="ar-risk-hint">Risk is calculated automatically from your questionnaire answers below.</p>
                  </div>
                </div>

                {requiredReviews.length > 0 && (
                  <div className="ar-field">
                    <label className="ar-label">
                      Required reviews
                      <span className="ar-label-hint">
                        Est. {Math.max(...requiredReviews.map(r => r.sloDays))} business days
                      </span>
                    </label>
                    <div className="ar-review-tags">
                      {requiredReviews.map((r, i) => (
                        <span key={i} className={`ar-review-tag ${r.defaultStatus === 'PENDING_REVIEW' ? 'pending' : 'fyi'}`}>
                          {r.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions — left-aligned like Ariane */}
            <div className="ar-actions">
              {actions({ formData, riskLevel, requiredReviews })}
            </div>
          </div>
        </div>

        {/* ── Questionnaire Sections ─────────────────────────── */}
        {visibleSections.map(section => (
          <div key={section.id} className="ar-section fade-in">
            <div className="ar-section-header">
              <span className="ar-check-icon outline">{section.icon}</span>
              <div>
                <div className="ar-section-title">{section.title}</div>
              </div>
            </div>

            <div className="ar-section-body">
              {section.questions.map(question => (
                <div key={question.id} className="ar-field">
                  <label className="ar-label">
                    {question.prompt}
                    {question.required && <span className="form-required"> *</span>}
                  </label>
                  {question.helpText && (
                    <p className="ar-help-text">{question.helpText}</p>
                  )}

                  {question.type === 'MULTI_SELECT' && question.choices && (
                    <div className="ar-choices">
                      {question.choices.map(choice => {
                        const selected = ((formData[question.fieldName as keyof LaunchFormData] as string[]) || []).includes(choice.id);
                        return (
                          <label key={choice.id} className={`ar-choice-item ${selected ? 'selected' : ''}`}>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => handleMultiSelect(question.fieldName as keyof LaunchFormData, choice.id)}
                              disabled={disabled}
                            />
                            <div className="ar-choice-text">
                              <span className="ar-choice-label">{choice.label}</span>
                              {choice.description && <span className="ar-choice-desc">{choice.description}</span>}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {question.type === 'SINGLE_SELECT' && question.choices && (
                    <div className="ar-choices">
                      {question.choices.map(choice => {
                        const selected = formData[question.fieldName as keyof LaunchFormData] === choice.id;
                        return (
                          <label key={choice.id} className={`ar-choice-item ${selected ? 'selected' : ''}`}>
                            <input
                              type="radio"
                              name={question.fieldName}
                              checked={selected}
                              onChange={() => handleSingleSelect(question.fieldName as keyof LaunchFormData, choice.id)}
                              disabled={disabled}
                            />
                            <div className="ar-choice-text">
                              <span className="ar-choice-label">{choice.label}</span>
                              {choice.description && <span className="ar-choice-desc">{choice.description}</span>}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {question.type === 'BOOLEAN' && (
                    <label className="ar-checkbox-row">
                      <input
                        type="checkbox"
                        checked={!!formData[question.fieldName as keyof LaunchFormData]}
                        onChange={() => handleBoolean(question.fieldName as keyof LaunchFormData)}
                        disabled={disabled}
                      />
                      <span>Yes</span>
                    </label>
                  )}
                </div>
              ))}

              {/* Section-level actions */}
              <div className="ar-actions">
                {actions({ formData, riskLevel, requiredReviews })}
              </div>
            </div>
          </div>
        ))}

        {/* ── Info Banner ────────────────────────────────────── */}
        <div className="ar-info-banner">
          <span className="ar-info-icon">?</span>
          <div>
            <div className="ar-info-title">Complete the questionnaire to determine required reviews</div>
            <div className="ar-info-desc">Selecting options in each section will determine the reviews, approvals, and team members required for this launch.</div>
          </div>
        </div>
      </div>
    </>
  );
}
