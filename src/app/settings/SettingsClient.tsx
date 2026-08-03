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
            <span className="ar-check-icon">☰</span>
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
        <IntegrationsSection org={org} />

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
        <table className="data-table w-full">
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
      <tr className="settings-review-row" onClick={onToggle}>
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
      {error && <div className="review-action-error mt-2">{error}</div>}
      <div className="ar-actions mt-2">
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
        <span className="ar-check-icon">⊕</span>
        <div>
          <div className="ar-section-title">Team Members</div>
          <div className="ar-section-subtitle">Manage who has access to your organization</div>
        </div>
      </div>
      <div className="ar-section-body">
        <table className="data-table w-full">
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
        <div className="ar-actions mt-4">
          <button className="btn btn-secondary btn-sm" disabled>+ Invite Member</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Section 5: Integrations
// ============================================================================

function SlackLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
      <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
      <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.522 2.521 2.528 2.528 0 0 1-2.52-2.521V2.522A2.528 2.528 0 0 1 15.165 0a2.528 2.528 0 0 1 2.521 2.522v6.312z" fill="#2EB67D"/>
      <path d="M15.165 18.956a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.522 2.527 2.527 0 0 1 2.52-2.52h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.521h-6.313z" fill="#ECB22E"/>
    </svg>
  );
}

function GitHubLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

function MailLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  );
}

function IntegrationsSection({ org }: { org: Organization }) {
  const [isPending, startTransition] = useTransition();
  const slackConnected = !!org.slack_bot_token_encrypted;

  const slackClientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.launchbits.dev';
  const slackOauthUrl = `https://slack.com/oauth/v2/authorize?client_id=${slackClientId}&scope=chat:write,chat:write.public,users:read,users:read.email&redirect_uri=${encodeURIComponent(`${appUrl}/api/slack/oauth`)}`;

  // GitHub
  const githubConnected = !!org.github_app_installation_id;
  const githubAppSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || 'launchbits';
  const githubInstallUrl = `https://github.com/apps/${githubAppSlug}/installations/new`;

  // Email
  const emailConnected = !!org.email_resend_api_key_encrypted;
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailApiKey, setEmailApiKey] = useState('');
  const [emailFrom, setEmailFrom] = useState(org.email_from_address || '');

  const handleDisconnect = () => {
    startTransition(async () => {
      const { disconnectSlackAction } = await import('@/app/actions');
      await disconnectSlackAction();
    });
  };

  const handleDisconnectGitHub = () => {
    startTransition(async () => {
      const { disconnectGitHubAction } = await import('@/app/actions');
      await disconnectGitHubAction();
    });
  };

  const handleConnectEmail = () => {
    if (!emailApiKey || !emailFrom) return;
    startTransition(async () => {
      const { connectEmailAction } = await import('@/app/actions');
      await connectEmailAction(emailApiKey, emailFrom);
      setShowEmailForm(false);
      setEmailApiKey('');
    });
  };

  const handleDisconnectEmail = () => {
    startTransition(async () => {
      const { disconnectEmailAction } = await import('@/app/actions');
      await disconnectEmailAction();
    });
  };

  return (
    <div className="ar-section">
      <div className="ar-section-header">
        <span className="ar-check-icon">⇌</span>
        <div>
          <div className="ar-section-title">Integrations</div>
          <div className="ar-section-subtitle">Connect external services to automate notifications and enforce policies</div>
        </div>
      </div>
      <div className="ar-section-body">
        {/* Slack — live */}
        <div className="ar-integration-row">
          <span className="ar-integration-icon"><SlackLogo /></span>
          <div className="ar-integration-info">
            <div className="ar-integration-name">
              Slack
              {slackConnected && <span className="tag tag-approved" style={{ marginLeft: 8 }}>Connected</span>}
            </div>
            <div className="ar-integration-desc">Send review requests and receive approvals directly in Slack.</div>
          </div>
          {slackConnected ? (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleDisconnect}
              disabled={isPending}
            >
              {isPending ? 'Disconnecting…' : 'Disconnect'}
            </button>
          ) : (
            <a href={slackOauthUrl} className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
              Connect
            </a>
          )}
        </div>

        {/* GitHub — live */}
        <div className="ar-integration-row">
          <span className="ar-integration-icon"><GitHubLogo /></span>
          <div className="ar-integration-info">
            <div className="ar-integration-name">
              GitHub
              {githubConnected && <span className="tag tag-approved" style={{ marginLeft: 8 }}>Connected</span>}
            </div>
            <div className="ar-integration-desc">Block PR merges until all review bits are green via Check Runs.</div>
          </div>
          {githubConnected ? (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleDisconnectGitHub}
              disabled={isPending}
            >
              {isPending ? 'Disconnecting…' : 'Disconnect'}
            </button>
          ) : (
            <a
              href={githubInstallUrl}
              className="btn btn-primary btn-sm"
              style={{ textDecoration: 'none' }}
            >
              Connect
            </a>
          )}
        </div>

        {/* Email — live */}
        <div className="ar-integration-row" style={{ flexWrap: 'wrap' }}>
          <span className="ar-integration-icon"><MailLogo /></span>
          <div className="ar-integration-info">
            <div className="ar-integration-name">
              Email (Resend)
              {emailConnected && <span className="tag tag-approved" style={{ marginLeft: 8 }}>Connected</span>}
            </div>
            <div className="ar-integration-desc">
              {emailConnected
                ? `Sending from ${org.email_from_address}`
                : 'Fallback notifications for users not on Slack.'}
            </div>
          </div>
          {emailConnected ? (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleDisconnectEmail}
              disabled={isPending}
            >
              {isPending ? 'Disconnecting…' : 'Disconnect'}
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowEmailForm(!showEmailForm)}
            >
              Connect
            </button>
          )}
          {showEmailForm && !emailConnected && (
            <div style={{ width: '100%', marginTop: 12, paddingLeft: 44 }}>
              <div className="ar-field" style={{ marginBottom: 8 }}>
                <label className="ar-label">Resend API Key</label>
                <input
                  type="password"
                  className="ar-input"
                  placeholder="re_..."
                  value={emailApiKey}
                  onChange={(e) => setEmailApiKey(e.target.value)}
                />
              </div>
              <div className="ar-field" style={{ marginBottom: 12 }}>
                <label className="ar-label">From Address</label>
                <input
                  type="email"
                  className="ar-input"
                  placeholder="notifications@yourdomain.com"
                  value={emailFrom}
                  onChange={(e) => setEmailFrom(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleConnectEmail}
                disabled={isPending || !emailApiKey || !emailFrom}
              >
                {isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
