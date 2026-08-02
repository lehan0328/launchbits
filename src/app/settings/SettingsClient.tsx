'use client';

import { useState, useTransition, useRef } from 'react';
import type { Organization, User, ReviewDefinition } from '@/lib/types';

// ============================================================================
// Settings — single-page, multi-section layout
// Reuses the Ariane section pattern (ar-section, ar-section-header, etc.)
// so Settings visually matches the Launch form experience.
// ============================================================================

interface SettingsClientProps {
  org: Organization;
  user: User;
  reviewDefs: ReviewDefinition[];
}

export default function SettingsClient({ org, user, reviewDefs }: SettingsClientProps) {
  return (
    <>
      <header className="app-header">
        <span className="app-header-title">Settings</span>
      </header>

      <div className="app-content">

        {/* ── Section 1: Organization ── */}
        <div className="ar-section">
          <div className="ar-section-header">
            <span className="ar-check-icon">⚙</span>
            <div>
              <div className="ar-section-title">Organization</div>
              <div className="ar-section-subtitle">Manage your organization identity and branding</div>
            </div>
          </div>
          <div className="ar-section-body">
            <div className="ar-two-col">
              <div className="ar-col">
                <div className="ar-field">
                  <label className="ar-label">Organization Name</label>
                  <input type="text" className="ar-input" defaultValue={org.name} disabled />
                </div>
                <div className="ar-field">
                  <label className="ar-label">Slug</label>
                  <input type="text" className="ar-input ar-input-short" defaultValue={org.slug} disabled />
                </div>
              </div>
              <div className="ar-col">
                <div className="ar-field">
                  <label className="ar-label">Status</label>
                  <p className="ar-hint">Organization settings will be editable in a future update.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Review Types ── */}
        <ReviewTypesSection reviewDefs={reviewDefs} />

        {/* ── Section 3: Policy Rules ── */}
        <div className="ar-section">
          <div className="ar-section-header">
            <span className="ar-check-icon">📋</span>
            <div>
              <div className="ar-section-title">Policy Rules</div>
              <div className="ar-section-subtitle">Rules determine which reviews are triggered based on questionnaire answers and risk level</div>
            </div>
          </div>
          <div className="ar-section-body">
            <div className="ar-field">
              <label className="ar-label">Active Policy Configuration</label>
              <pre className="ar-code-block">
{`- review_type: PRIVACY
  trigger_when:
    any_of:
      - field: q_data_classes
        contains_any: [DATA_CONTENT, DATA_FINANCIAL, DATA_BIOMETRICS]
  risk_overrides:
    LOW:    { default_status: FYI }
    MEDIUM: { default_status: PENDING_REVIEW }
    HIGH:   { default_status: PENDING_REVIEW, fyi_allowed: false }`}
              </pre>
            </div>
            <div className="ar-info-banner">
              <span className="ar-info-icon">ℹ</span>
              <span>
                Currently defined programmatically in <code className="ar-inline-code">rules-engine.ts</code>.
                A visual policy editor is planned for v1.0.
              </span>
            </div>
          </div>
        </div>

        {/* ── Section 4: Team ── */}
        <TeamSection users={[user]} />

        {/* ── Section 5: Integrations ── */}
        <IntegrationsSection />

      </div>
    </>
  );
}

// ============================================================================
// Section 2: Review Types
// ============================================================================

function ReviewTypesSection({ reviewDefs }: { reviewDefs: ReviewDefinition[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="ar-section">
      <div className="ar-section-header">
        <span className="ar-check-icon">✓</span>
        <div>
          <div className="ar-section-title">Review Types</div>
          <div className="ar-section-subtitle">Configure review categories, SLOs, and allowed reviewer pools</div>
        </div>
      </div>
      <div className="ar-section-body">
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Label</th>
              <th>Type</th>
              <th>SLO</th>
              <th>Reviewers</th>
              <th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {reviewDefs.map(rd => (
              <ReviewDefRow
                key={rd.id}
                rd={rd}
                isExpanded={expandedId === rd.id}
                onToggle={() => setExpandedId(expandedId === rd.id ? null : rd.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReviewDefRow({ rd, isExpanded, onToggle }: {
  rd: ReviewDefinition;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="settings-review-row" onClick={onToggle} style={{ cursor: 'pointer' }}>
        <td className="font-medium">{rd.label}</td>
        <td>
          <span className="review-status-tag review-status-tag--fyi">{rd.review_type}</span>
        </td>
        <td>{rd.slo_days}d{rd.slo_business_days_only ? ' (biz)' : ''}</td>
        <td>
          {rd.reviewer_emails.length > 0 ? (
            <span>{rd.reviewer_emails.length} reviewer{rd.reviewer_emails.length !== 1 ? 's' : ''}</span>
          ) : (
            <span className="text-secondary text-sm">Anyone</span>
          )}
        </td>
        <td>
          <span className="text-sm">
            {rd.access_restricted && '🔒 '}
            {rd.owner_approval_disallowed && '🚫 '}
            {rd.fyi_allowed && 'FYI '}
            {!rd.access_restricted && !rd.owner_approval_disallowed && !rd.fyi_allowed && '—'}
          </span>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={5}>
            <ReviewerEmailEditor reviewDefId={rd.id} initialEmails={rd.reviewer_emails} />
          </td>
        </tr>
      )}
    </>
  );
}

function ReviewerEmailEditor({ reviewDefId, initialEmails }: { reviewDefId: string; initialEmails: string[] }) {
  const [emails, setEmails] = useState<string[]>(initialEmails);
  const [inputValue, setInputValue] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasChanges = JSON.stringify(emails) !== JSON.stringify(initialEmails);

  function addEmail(value: string) {
    const clean = value.trim().toLowerCase();
    if (!clean) return;
    if (emails.includes(clean)) {
      setError(`${clean} is already in the list`);
      return;
    }
    setEmails([...emails, clean]);
    setInputValue('');
    setError(null);
    setSaved(false);
  }

  function removeEmail(email: string) {
    setEmails(emails.filter(e => e !== email));
    setSaved(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail(inputValue);
    }
    if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
      removeEmail(emails[emails.length - 1]);
    }
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const { updateReviewerEmailsAction } = await import('@/app/actions');
        await updateReviewerEmailsAction(reviewDefId, emails);
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save');
      }
    });
  }

  return (
    <div className="settings-review-expand-panel">
      <label className="ar-label">Allowed Reviewers</label>
      <div className="chip-input-container" onClick={() => inputRef.current?.focus()}>
        {emails.map(email => (
          <span key={email} className="chip">
            {email}
            <button
              type="button"
              className="chip-remove"
              onClick={(e) => { e.stopPropagation(); removeEmail(email); }}
              aria-label={`Remove ${email}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="email"
          className="chip-text-input"
          placeholder={emails.length === 0 ? 'Type email and press Enter...' : 'Add another...'}
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setError(null); }}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (inputValue.trim()) addEmail(inputValue); }}
        />
      </div>
      {error && <div className="review-action-error" style={{ marginTop: 8 }}>{error}</div>}
      <div className="ar-actions" style={{ marginTop: 12 }}>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSave}
          disabled={!hasChanges || isPending}
        >
          {isPending ? 'Saving...' : saved ? '✓ Saved' : 'Save Reviewers'}
        </button>
        {emails.length === 0 && (
          <span className="text-sm text-secondary">
            No restrictions — any reviewer can approve
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Section 4: Team
// ============================================================================

function TeamSection({ users }: { users: User[] }) {
  return (
    <div className="ar-section">
      <div className="ar-section-header">
        <span className="ar-check-icon">👥</span>
        <div>
          <div className="ar-section-title">Team Members</div>
          <div className="ar-section-subtitle">Manage who has access to your organization</div>
        </div>
      </div>
      <div className="ar-section-body">
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Member</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <span className="ar-member-row">
                    <span className="ar-member-avatar">{u.display_name.charAt(0).toUpperCase()}</span>
                    <span className="font-medium">{u.display_name}</span>
                  </span>
                </td>
                <td className="text-secondary">{u.email}</td>
                <td>
                  <span className={`review-status-tag ${u.role === 'admin' ? 'review-status-tag--pending' : 'review-status-tag--fyi'}`}>
                    {u.role}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ar-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-secondary btn-sm" disabled>+ Invite Member</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Section 5: Integrations
// ============================================================================

const INTEGRATIONS = [
  { name: 'Slack', desc: 'Send review requests and receive approvals directly in Slack.', action: 'Connect', icon: '💬' },
  { name: 'GitHub', desc: 'Block PR merges until all review bits are green via Check Runs.', action: 'Install App', icon: '🐙' },
  { name: 'Email (Resend)', desc: 'Fallback notifications for users not on Slack.', action: 'Configure', icon: '✉️' },
];

function IntegrationsSection() {
  return (
    <div className="ar-section">
      <div className="ar-section-header">
        <span className="ar-check-icon">🔗</span>
        <div>
          <div className="ar-section-title">Integrations</div>
          <div className="ar-section-subtitle">Connect external services to automate notifications and enforce policies</div>
        </div>
      </div>
      <div className="ar-section-body">
        {INTEGRATIONS.map(int => (
          <div key={int.name} className="ar-integration-row">
            <span className="ar-integration-icon">{int.icon}</span>
            <div className="ar-integration-info">
              <div className="ar-integration-name">{int.name}</div>
              <div className="ar-integration-desc">{int.desc}</div>
            </div>
            <button className="btn btn-secondary btn-sm" disabled>{int.action}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
