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
    </aside>
  );
}
