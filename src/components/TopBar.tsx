'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSidebar } from '@/contexts/SidebarContext';
import { signOutAction } from '@/app/actions';
import type { User } from '@/lib/types';

interface TopBarProps {
  user: User;
}

export default function TopBar({ user }: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { toggle } = useSidebar();

  // Generate initials from display name
  const initials = user.display_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="global-topbar">
      <div className="topbar-left">
        <button
          className="hamburger-btn"
          onClick={toggle}
          aria-label="Toggle sidebar"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="#5f6368" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <Link href="/" className="topbar-brand">
          <Image
            src="/logo-lockup.png"
            alt="Launchbits"
            width={160}
            height={40}
            className="logo-mark"
            priority
          />
        </Link>
      </div>

      <div className="topbar-center">
        <div className="search-input-wrapper">
          <span className="search-input-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="#5f6368"/>
            </svg>
          </span>
          <input
            type="text"
            className="search-input"
            placeholder="Search launches..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="topbar-right">
        <form action={signOutAction}>
          <button
            type="submit"
            className="topbar-avatar"
            title={`${user.display_name} — Sign out`}
          >
            {initials}
          </button>
        </form>
      </div>
    </header>
  );
}
