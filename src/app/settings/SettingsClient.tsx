'use client';

import { useState, useTransition } from 'react';
import type { Organization, User, ReviewDefinition } from '@/lib/types';

type SettingsTab = 'general' | 'reviews' | 'policies' | 'team' | 'integrations';

const TABS: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: '⚙' },
  { id: 'reviews', label: 'Review Types', icon: '✓' },
  { id: 'policies', label: 'Policy Rules', icon: '📋' },
  { id: 'team', label: 'Team', icon: '👥' },
  { id: 'integrations', label: 'Integrations', icon: '🔗' },
];

interface SettingsClientProps {
  org: Organization;
  user: User;
  reviewDefs: ReviewDefinition[];
}

export default function SettingsClient({ org, user, reviewDefs }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  return (
    <div className="app-content">
      <h1 className="page-title" style={{ marginBottom: 24 }}>Settings</h1>

      <div className="settings-layout">
        {/* Sidebar Navigation */}
        <nav className="settings-nav">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="settings-nav-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content Area */}
        <div className="settings-content">
          {activeTab === 'general' && (
            <GeneralSettings orgName={org.name} orgSlug={org.slug} />
          )}
          {activeTab === 'reviews' && (
            <ReviewSettings reviewDefs={reviewDefs} />
          )}
          {activeTab === 'policies' && (
            <PolicySettings />
          )}
          {activeTab === 'team' && (
            <TeamSettings users={[user]} />
          )}
          {activeTab === 'integrations' && (
            <IntegrationSettings />
          )}
        </div>
      </div>
    </div>
  );
}

// --- Sub-sections ---

function GeneralSettings({ orgName, orgSlug }: { orgName: string; orgSlug: string }) {
  return (
    <div>
      <h2 className="page-subtitle" style={{ marginBottom: 16 }}>Organization</h2>
      <div className="settings-card">
        <div className="settings-field">
          <label className="form-label">Organization Name</label>
          <input type="text" className="form-input" defaultValue={orgName} disabled />
        </div>
        <div className="settings-field">
          <label className="form-label">Slug</label>
          <input type="text" className="form-input" defaultValue={orgSlug} disabled />
        </div>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)', marginTop: 8 }}>
          Organization settings will be editable in a future update.
        </p>
      </div>
    </div>
  );
}

function ReviewSettings({ reviewDefs }: { reviewDefs: ReviewDefinition[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="page-subtitle">Review Types</h2>
        <button className="btn btn-primary" disabled>+ Add Review Type</button>
      </div>
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
  );
}

function ReviewDefRow({ rd, isExpanded, onToggle }: {
  rd: ReviewDefinition;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="settings-review-row" onClick={onToggle}>
        <td style={{ fontWeight: 500 }}>{rd.label}</td>
        <td>
          <span className="status-tag" style={{ background: 'var(--status-fyi-bg)', color: 'var(--status-fyi-text)', border: '1px solid var(--status-fyi-border)' }}>
            {rd.review_type}
          </span>
        </td>
        <td>{rd.slo_days}d{rd.slo_business_days_only ? ' (biz)' : ''}</td>
        <td>
          {rd.reviewer_emails.length > 0 ? (
            <span className="settings-reviewer-count">{rd.reviewer_emails.length} reviewer{rd.reviewer_emails.length !== 1 ? 's' : ''}</span>
          ) : (
            <span className="text-muted text-sm">Anyone</span>
          )}
        </td>
        <td>
          <span className="text-sm">
            {rd.access_restricted ? '🔒 ' : ''}
            {rd.owner_approval_disallowed ? '🚫 ' : ''}
            {rd.fyi_allowed ? 'FYI ' : ''}
            {!rd.access_restricted && !rd.owner_approval_disallowed && !rd.fyi_allowed ? '—' : ''}
          </span>
        </td>
      </tr>
      {isExpanded && (
        <tr className="settings-review-expand-row">
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
      <label className="form-label">Allowed Reviewers</label>
      <div className="chip-input-container" onClick={() => {
        const input = document.getElementById(`chip-input-${reviewDefId}`);
        if (input) input.focus();
      }}>
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
          id={`chip-input-${reviewDefId}`}
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
      <div className="settings-reviewer-actions">
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSave}
          disabled={!hasChanges || isPending}
        >
          {isPending ? 'Saving...' : saved ? '✓ Saved' : 'Save Reviewers'}
        </button>
        {emails.length === 0 && (
          <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            No restrictions — any reviewer can approve
          </span>
        )}
      </div>
    </div>
  );
}

function PolicySettings() {
  return (
    <div>
      <h2 className="page-subtitle" style={{ marginBottom: 16 }}>Policy Rules</h2>
      <div className="settings-card">
        <p className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
          Policy rules determine which reviews are automatically triggered based on questionnaire answers and risk level.
          Currently configured in <code style={{ fontFamily: 'var(--font-code)', background: 'var(--bg-surface-container)', padding: '2px 6px', borderRadius: 4 }}>rules-engine.ts</code>.
        </p>
        <div style={{ background: 'var(--bg-surface-container)', borderRadius: 'var(--radius-md)', padding: 16, fontFamily: 'var(--font-code)', fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
{`# YAML policy editor coming in v1.0
# Current rules are defined programmatically

- review_type: PRIVACY
  trigger_when:
    any_of:
      - field: q_data_classes
        contains_any: [DATA_CONTENT, DATA_FINANCIAL, DATA_BIOMETRICS]
  risk_overrides:
    LOW:    { default_status: FYI }
    MEDIUM: { default_status: PENDING_REVIEW }
    HIGH:   { default_status: PENDING_REVIEW, fyi_allowed: false }`}
        </div>
      </div>
    </div>
  );
}

function TeamSettings({ users }: { users: User[] }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="page-subtitle">Team Members</h2>
        <button className="btn btn-primary" disabled>+ Invite Member</button>
      </div>
      <table className="data-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td style={{ fontWeight: 500 }}>{u.display_name}</td>
              <td>{u.email}</td>
              <td>
                <span className="status-tag" style={{
                  background: u.role === 'admin' ? 'var(--status-pending-bg)' : 'var(--status-fyi-bg)',
                  color: u.role === 'admin' ? 'var(--status-pending-text)' : 'var(--status-fyi-text)',
                  border: `1px solid ${u.role === 'admin' ? 'var(--status-pending-border)' : 'var(--status-fyi-border)'}`,
                }}>
                  {u.role}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IntegrationSettings() {
  return (
    <div>
      <h2 className="page-subtitle" style={{ marginBottom: 16 }}>Integrations</h2>

      <div className="settings-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Slack</h3>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Send review requests and receive approvals directly in Slack.
            </p>
          </div>
          <button className="btn" disabled>Connect</button>
        </div>
      </div>

      <div className="settings-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>GitHub</h3>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Block PR merges until all review bits are green via Check Runs.
            </p>
          </div>
          <button className="btn" disabled>Install App</button>
        </div>
      </div>

      <div className="settings-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Email (Resend)</h3>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Fallback notifications for users not on Slack.
            </p>
          </div>
          <button className="btn" disabled>Configure</button>
        </div>
      </div>
    </div>
  );
}
