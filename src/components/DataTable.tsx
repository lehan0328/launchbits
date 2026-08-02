'use client';

import { useState, ReactNode, Fragment } from 'react';
import Link from 'next/link';

// ============================================================================
// Column definition — drives header + cell rendering
// ============================================================================

export interface ColumnDef<T> {
  /** Unique key for React & CSS class */
  key: string;
  /** Header label */
  header: string;
  /** Optional CSS class on <th> and <td> */
  className?: string;
  /** Whether column header shows sortable indicator */
  sortable?: boolean;
  /** Cell renderer — receives the row data */
  render: (row: T) => ReactNode;
}

// ============================================================================
// Table toolbar (sort + export)
// ============================================================================

export interface SortOption {
  value: string;
  label: string;
}

interface TableToolbarProps {
  /** Static label (backward compat) OR array of sort options */
  sortLabel?: string;
  sortOptions?: SortOption[];
  sortValue?: string;
  onSortChange?: (value: string) => void;
  sortAsc: boolean;
  onToggleSort: () => void;
  /** Additional actions on the right side */
  actions?: ReactNode;
}

export function TableToolbar({
  sortLabel = 'Launch Date',
  sortOptions,
  sortValue,
  onSortChange,
  sortAsc,
  onToggleSort,
  actions,
}: TableToolbarProps) {
  return (
    <div className="table-toolbar">
      <div className="table-toolbar-left">
        <span className="sort-icon">≡</span>
        {sortOptions && onSortChange ? (
          <select
            className="sort-dropdown-select"
            value={sortValue}
            onChange={e => onSortChange(e.target.value)}
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <button className="sort-dropdown">
            {sortLabel} ▾
          </button>
        )}
        <button
          className="sort-direction"
          onClick={onToggleSort}
          aria-label="Toggle sort direction"
        >
          {sortAsc ? '↑' : '↓'}
        </button>
      </div>
      <div className="table-toolbar-right">
        {actions ?? (
          <button className="toolbar-action">
            ↓ Export to sheets
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DataTable — the core reusable table
// ============================================================================

interface DataTableProps<T extends { id: string }> {
  /** Row data */
  data: T[];
  /** Column definitions drive header + cells */
  columns: ColumnDef<T>[];
  /** Show checkbox column for row selection */
  selectable?: boolean;
  /** Show expand chevron column */
  expandable?: boolean;
  /** Content to render when expanded (receives the row) */
  renderExpanded?: (row: T) => ReactNode;
  /** Empty state when data.length === 0 */
  emptyState?: ReactNode;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  selectable = true,
  expandable = true,
  renderExpanded,
  emptyState,
}: DataTableProps<T>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const allSelected = data.length > 0 && selected.size === data.length;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(data.map(d => d.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  return (
    <table className="data-table">
      <thead>
        <tr>
          {selectable && (
            <th className="col-checkbox">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
              />
            </th>
          )}
          {columns.map(col => (
            <th
              key={col.key}
              className={[col.className, col.sortable ? 'sortable' : ''].filter(Boolean).join(' ')}
            >
              {col.header}
            </th>
          ))}
          {expandable && <th className="col-expand"></th>}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 && emptyState ? (
          <tr>
            <td
              colSpan={columns.length + (selectable ? 1 : 0) + (expandable ? 1 : 0)}
              className="dt-empty-cell"
            >
              {emptyState}
            </td>
          </tr>
        ) : (
          data.map(row => (
            <Fragment key={row.id}>
              <tr key={row.id}>
                {selectable && (
                  <td className="col-checkbox">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleOne(row.id)}
                    />
                  </td>
                )}
                {columns.map(col => (
                  <td key={col.key} className={col.className}>
                    {col.render(row)}
                  </td>
                ))}
                {expandable && (
                  <td className="col-expand">
                    <button
                      className={`expand-btn ${expanded.has(row.id) ? 'expanded' : ''}`}
                      onClick={() => toggleExpand(row.id)}
                      aria-label="Expand"
                    >
                      ⌄
                    </button>
                  </td>
                )}
              </tr>
              {expandable && expanded.has(row.id) && renderExpanded && (
                <tr key={`${row.id}-expanded`} className="expanded-row">
                  <td colSpan={columns.length + (selectable ? 1 : 0) + 1}>
                    {renderExpanded(row)}
                  </td>
                </tr>
              )}
            </Fragment>
          ))
        )}
      </tbody>
    </table>
  );
}

// ============================================================================
// Section header (e.g. "Owned by you | All 4 Launches | View All")
// ============================================================================

interface SectionHeaderProps {
  title: string;
  count: number;
  viewAllHref?: string;
  style?: React.CSSProperties;
  className?: string;
}

export function SectionHeader({ title, count, viewAllHref = '/', style, className }: SectionHeaderProps) {
  return (
    <div className={`section-divider ${className || ''}`} style={style}>
      <div className="section-divider-left">
        <span className="section-divider-title">{title}</span>
        <span className="section-divider-count">All {count} Launches</span>
      </div>
      <Link href={viewAllHref} className="section-view-all">View All</Link>
    </div>
  );
}

// ============================================================================
// Status text helper (shared across pages)
// ============================================================================

export function statusTextClass(status: string): string {
  const map: Record<string, string> = {
    DRAFT: 'status-text--draft',
    IN_REVIEW: 'status-text--in-review',
    APPROVED: 'status-text--approved',
    LAUNCHED: 'status-text--approved',
    LAUNCHED_WITH_EXCEPTION: 'status-text--exception',
    CANCELLED: 'status-text--cancelled',
    // Review-specific statuses
    PENDING_REVIEW: 'status-text--in-review',
    IN_PROGRESS: 'status-text--in-review',
    NEEDS_WORK: 'status-text--exception',
    DENIED: 'status-text--cancelled',
    FYI: 'status-text--draft',
    NOT_REQUIRED: 'status-text--draft',
  };
  return map[status] || '';
}
