'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import { store } from '@/lib/store';

export default function Sidebar() {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  const [pastExpanded, setPastExpanded] = useState(false);
  const [teamsExpanded, setTeamsExpanded] = useState(false);

  // Dynamic counts from store
  const ownedCount = store.getLaunches().length;
  const currentUser = store.getCurrentUser();
  const pendingCount = store.getPendingReviewsForUser(currentUser.id).length;

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Create Launch — prominent button */}
      <div style={{ padding: '12px 16px' }}>
        <Link href="/launches/new" className="create-launch-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="#4F46E5"/>
          </svg>
          {!collapsed && 'Create launch'}
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="nav-group">
        <Link
          href="/"
          className={`nav-link ${pathname === '/' ? 'active' : ''}`}
        >
          Home
        </Link>
        <Link
          href="/owned"
          className={`nav-link ${pathname === '/owned' ? 'active' : ''}`}
        >
          Owned by you
          <span className="nav-count">({ownedCount})</span>
        </Link>
        <Link
          href="/reviews"
          className={`nav-link ${pathname === '/reviews' ? 'active' : ''}`}
        >
          Pending your approval
          <span className="nav-count">({pendingCount})</span>
        </Link>
        <Link
          href="/drafts"
          className={`nav-link ${pathname === '/drafts' ? 'active' : ''}`}
        >
          Drafts
        </Link>
        <Link
          href="/subscribed"
          className={`nav-link ${pathname === '/subscribed' ? 'active' : ''}`}
        >
          Subscribed
        </Link>
        <Link
          href="/audit"
          className={`nav-link ${pathname === '/audit' ? 'active' : ''}`}
        >
          Audit log
        </Link>
      </nav>

      {/* Collapsible Sections */}
      {!collapsed && (
        <>
          <div className="sidebar-section">
            <div
              className="sidebar-section-header"
              onClick={() => setPastExpanded(!pastExpanded)}
            >
              <span className={`sidebar-section-chevron ${pastExpanded ? 'expanded' : ''}`}>▸</span>
              <span>Past launches</span>
            </div>
          </div>

          <div className="sidebar-section">
            <div
              className="sidebar-section-header"
              onClick={() => setTeamsExpanded(!teamsExpanded)}
            >
              <span className={`sidebar-section-chevron ${teamsExpanded ? 'expanded' : ''}`}>▸</span>
              <span>Your teams</span>
              <span className="sidebar-add-btn" role="button" onClick={(e) => { e.stopPropagation(); }}>+</span>
            </div>
          </div>
        </>
      )}

      {/* Settings — pinned to bottom (industry standard) */}
      <div className="sidebar-bottom">
        <Link
          href="/settings"
          className={`nav-link sidebar-bottom-link ${pathname.startsWith('/settings') ? 'active' : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" fill="currentColor"/>
          </svg>
          {!collapsed && 'Settings'}
        </Link>
      </div>
    </aside>
  );
}
