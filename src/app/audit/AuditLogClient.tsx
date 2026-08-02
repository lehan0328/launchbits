'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { LaunchEvent } from '@/lib/types';

/** Event type → human label + color token */
const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  LAUNCH_CREATED: { label: 'Created', color: 'draft' },
  SUBMITTED_FOR_REVIEW: { label: 'Submitted for Review', color: 'pending' },
  REVIEW_APPROVED: { label: 'Review Approved', color: 'approved' },
  REVIEW_NEEDS_WORK: { label: 'Needs Work', color: 'warning' },
  REVIEW_DENIED: { label: 'Review Denied', color: 'blocked' },
  REVIEW_FYI: { label: 'Downgraded to FYI', color: 'fyi' },
  REVIEW_REASSIGNED: { label: 'Review Reassigned', color: 'fyi' },
  LAUNCH_APPROVED: { label: 'Launch Approved', color: 'approved' },
  LAUNCH_LAUNCHED: { label: 'Launched', color: 'purple' },
  LAUNCHED_WITH_EXCEPTION: { label: 'Launched with Exception', color: 'warning' },
  LAUNCH_CANCELLED: { label: 'Cancelled', color: 'blocked' },
  LAUNCH_EDITED: { label: 'Edited', color: 'draft' },
  LAUNCH_UPDATED: { label: 'Updated', color: 'draft' },
  EMERGENCY_BYPASS: { label: 'Emergency Bypass', color: 'blocked' },
  SLO_BREACHED: { label: 'SLO Breached', color: 'blocked' },
};

const PAGE_SIZE = 20;

function getEventConfig(type: string) {
  return EVENT_TYPE_CONFIG[type] || { label: type, color: 'fyi' };
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' at '
    + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

interface AuditLogClientProps {
  events: LaunchEvent[];
  launchNames: Record<string, string>;
}

export default function AuditLogClient({ events, launchNames }: AuditLogClientProps) {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [page, setPage] = useState(0);

  const eventTypes = useMemo(() => {
    const types = new Set(events.map(e => e.event_type));
    return Array.from(types).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (filterType === 'ALL') return events;
    return events.filter(e => e.event_type === filterType);
  }, [events, filterType]);

  const totalPages = Math.ceil(filteredEvents.length / PAGE_SIZE);
  const pagedEvents = filteredEvents.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="app-content">
      <div className="page-header-bar">
        <h1 className="page-title">Audit Log</h1>
        <button className="btn" disabled title="Requires backend connection">
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="table-toolbar mb-4">
        <div className="audit-filter-bar">
          <label className="text-sm audit-filter-label">Event type:</label>
          <select
            className="form-input audit-filter-select"
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(0); }}
          >
            <option value="ALL">All events ({events.length})</option>
            {eventTypes.map(t => (
              <option key={t} value={t}>
                {getEventConfig(t).label} ({events.filter(e => e.event_type === t).length})
              </option>
            ))}
          </select>
        </div>
        <span className="text-sm audit-filter-count">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Events Table */}
      <table className="data-table w-full">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Event</th>
            <th>Launch</th>
            <th>Performed By</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {pagedEvents.map(event => {
            const config = getEventConfig(event.event_type);
            return (
              <tr key={event.id}>
                <td className="audit-timestamp-cell">
                  {formatDateTime(event.performed_at)}
                </td>
                <td>
                  <span
                    className="status-tag"
                    style={{
                      background: `var(--status-${config.color}-bg)`,
                      color: `var(--status-${config.color}-text)`,
                      border: `1px solid var(--status-${config.color}-border)`,
                    }}
                  >
                    {config.label}
                  </span>
                </td>
                <td>
                  <Link
                    href={`/launches/${event.launch_id}`}
                    className="audit-link-cell"
                  >
                    {launchNames[event.launch_id] || event.launch_id}
                  </Link>
                </td>
                <td className="audit-actor-cell">
                  {event.performed_by_name || '—'}
                </td>
                <td className="audit-details-cell">
                  {formatEventDetails(event)}
                </td>
              </tr>
            );
          })}
          {pagedEvents.length === 0 && (
            <tr>
              <td colSpan={5} className="audit-empty-cell">
                No events found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            ← Previous
          </button>
          <span className="text-sm pagination-info">
            Page {page + 1} of {totalPages}
          </span>
          <button
            className="btn btn-sm"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

/** Format event details into a human-readable string */
function formatEventDetails(event: LaunchEvent): string {
  if (event.notes) return event.notes;

  const newVal = event.new_value as Record<string, unknown> | null;
  if (!newVal) return '—';

  if (event.event_type === 'SUBMITTED_FOR_REVIEW' && newVal.reviews) {
    return `Reviews: ${(newVal.reviews as string[]).join(', ')}`;
  }
  if (event.event_type === 'REVIEW_APPROVED' && newVal.review) {
    return `${newVal.review} → APPROVED`;
  }
  if (event.event_type === 'LAUNCHED_WITH_EXCEPTION' && newVal.pending_reviews) {
    return `Pending: ${(newVal.pending_reviews as string[]).join(', ')}`;
  }

  return '—';
}
