---
name: launchbits-codebase
description: >
  Coding standards and architecture patterns for the Launchbits Next.js application.
  Covers file organization, component patterns, type safety, styling conventions,
  and data layer usage. Triggers when adding new pages, components, or features.
---

# Launchbits Codebase Patterns

## File Organization

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout (TopBar + Sidebar + app-layout shell)
│   ├── page.tsx            # Dashboard
│   ├── error.tsx           # Error boundary
│   ├── not-found.tsx       # 404 page
│   ├── loading.tsx         # Loading skeleton
│   ├── globals.css         # All styles (design tokens → utilities → components)
│   ├── owned/page.tsx      # "Owned by you" view
│   ├── reviews/page.tsx    # "Pending your approval" view
│   └── launches/
│       ├── new/page.tsx    # Create launch form
│       └── [id]/page.tsx   # Launch detail view
├── components/             # Reusable UI components
│   ├── DataTable.tsx       # Generic table (ColumnDef, TableToolbar, SectionHeader)
│   ├── Sidebar.tsx         # App sidebar navigation
│   └── TopBar.tsx          # Global header bar
├── contexts/               # React contexts (client-side only)
│   └── SidebarContext.tsx  # Sidebar collapse/expand state
└── lib/                    # Pure logic, data, types (no JSX except columns.tsx)
    ├── types.ts            # All TypeScript interfaces and type aliases
    ├── store.ts            # In-memory data store (MVP, replace with Supabase)
    ├── utils.ts            # Formatting, label helpers, status mappers
    ├── labels.ts           # Display label maps (data classification, network, etc.)
    ├── columns.tsx         # Shared DataTable column definitions + ReviewsCell
    ├── questionnaire.ts    # Questionnaire section/question configuration
    ├── risk-calculator.ts  # Risk level computation from questionnaire answers
    └── rules-engine.ts     # Policy rules → required reviews evaluation
```

## Adding a New Page

1. Create `src/app/<route>/page.tsx`
2. Do NOT add `<Sidebar>`, `app-layout`, or `<main>` wrapper — layout.tsx handles that
3. Your page renders inside `<div className="app-content">` only
4. Add `'use client'` directive only if the page needs React state or event handlers

```tsx
// ✅ Correct
'use client';
import { useState } from 'react';

export default function MyPage() {
  const [data, setData] = useState([]);
  return (
    <div className="app-content">
      {/* Page content only */}
    </div>
  );
}

// ❌ Wrong — duplicates the layout
export default function MyPage() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <div className="app-content">...</div>
      </main>
    </div>
  );
}
```

## Adding a New Table View

1. Define column definitions in `src/lib/columns.tsx`
2. Use `DataTable` + `TableToolbar` from `src/components/DataTable.tsx`
3. Use existing `ColumnDef<T>` interface — don't create ad-hoc column types
4. Reuse `ReviewsCell` from columns.tsx if showing review progress

```tsx
import { DataTable, TableToolbar } from '@/components/DataTable';
import { getOwnedColumns } from '@/lib/columns';

// In page:
<TableToolbar sortAsc={sortAsc} onToggleSort={() => setSortAsc(!sortAsc)} />
<DataTable data={launches} columns={getOwnedColumns()} />
```

## Adding a New Type

1. Add to `src/lib/types.ts`
2. Use union types for enums (e.g., `type NewStatus = 'A' | 'B' | 'C'`)
3. Use explicit field definitions — never `[key: string]: unknown`
4. If it's a "joined" type (like ReviewWithLaunch), extend the base type with `extends`

## Styling Patterns

### Design Tokens (in `:root` of globals.css)
```css
var(--color-primary)          /* #4F46E5 indigo — all accent colors */
var(--color-primary-hover)    /* #4338CA — hover state */
var(--color-primary-container) /* #EEF2FF — light indigo bg */
var(--text-primary)           /* #202124 — body text */
var(--text-secondary)         /* Alias: #5f6368 */
var(--font-heading)           /* Inter — headings, labels */
var(--font-body)              /* Inter — body text */
var(--font-code)              /* Roboto Mono — IDs, code */
```

### Utility Classes Available
```
flex, flex-col, items-center, justify-between
gap-1 through gap-4
mt-2, mt-3, mt-4, mt-8, mb-2, mb-3, mb-4, mb-6
text-sm, text-xs, text-primary, text-secondary, text-muted
font-medium, truncate
```

### Rules
- Use CSS classes over inline styles for anything repeated
- Use design token variables (`var(--color-primary)`) over hardcoded hex values
- New component styles go in globals.css with a clear section comment

## Data Layer

The store (`src/lib/store.ts`) is an in-memory singleton. Key patterns:

```tsx
import { store } from '@/lib/store';

// Read
const launches = store.getLaunches();
const reviews = store.getReviewsForLaunch(launchId);
const user = store.getCurrentUser();

// Write (mutations don't trigger re-renders — navigation forces remount)
store.createLaunch({ name: '...' });
store.updateLaunch(id, { status: 'IN_REVIEW' });
store.addReview({ ... });
```

> **Important**: Store mutations don't trigger React re-renders. This is acceptable for MVP because navigation forces component remount. When migrating to Supabase, use React Query or SWR for data fetching.
