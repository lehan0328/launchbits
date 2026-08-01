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
│   ├── page.tsx            # Dashboard (home)
│   ├── error.tsx           # Error boundary
│   ├── not-found.tsx       # 404 page
│   ├── loading.tsx         # Loading skeleton
│   ├── globals.css         # All styles (design tokens → utilities → components)
│   ├── owned/page.tsx      # "Owned by you" view
│   ├── reviews/page.tsx    # "Pending your approval" view
│   ├── audit/page.tsx      # Audit log (all launch events)
│   ├── settings/page.tsx   # Org settings (review definitions, team)
│   └── launches/
│       ├── new/page.tsx    # Create launch form (uses LaunchForm)
│       └── [id]/
│           ├── page.tsx    # Launch detail view
│           └── edit/page.tsx # Edit launch form (uses LaunchForm)
├── components/             # Reusable UI components
│   ├── DataTable.tsx       # Generic table (ColumnDef, TableToolbar, SectionHeader)
│   ├── LaunchForm.tsx      # Shared create/edit form (Ariane-style, questionnaire, risk)
│   ├── Sidebar.tsx         # App sidebar navigation
│   └── TopBar.tsx          # Global header bar
├── contexts/               # React contexts (client-side only)
│   └── SidebarContext.tsx  # Sidebar collapse/expand state
├── db/
│   └── schema.sql          # PostgreSQL schema (Supabase-ready, not yet wired)
└── lib/                    # Pure logic, data, types (no JSX except columns.tsx)
    ├── types.ts            # All TypeScript interfaces and type aliases
    ├── store.ts            # In-memory data store (MVP, replace with Supabase)
    ├── utils.ts            # Formatting, label helpers, status mappers
    ├── labels.ts           # Display label maps (data classification, network, etc.)
    ├── columns.tsx         # Shared DataTable column definitions + ReviewsCell
    ├── questionnaire.ts    # Questionnaire section/question configuration
    ├── risk-calculator.ts  # Risk level computation from questionnaire answers
    ├── rules-engine.ts     # Policy rules → required reviews evaluation
    ├── permissions.ts      # RBAC permission checks (not yet wired to UI)
    └── state-machine.ts    # Launch status FSM transitions (not yet wired to UI)
```

## Component Reuse Rule

> **CRITICAL**: Before creating any new component, check if a reusable component
> already exists in `src/components/`. If it does, USE IT. Do not duplicate
> functionality. The existing components are:
>
> - **`DataTable`** — for any tabular data display. Always pair with column
>   definitions from `src/lib/columns.tsx`.
> - **`TableToolbar`** — for sort toggles and filter controls above a DataTable.
> - **`SectionHeader`** — for titled sections with a count badge and "View all" link.
> - **`LaunchForm`** — for create and edit launch forms. Do NOT build a new form.
> - **`Sidebar`** / **`TopBar`** — global chrome, never duplicated in page code.

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

## Adding New Questionnaire Sections

1. Add the new section to `QUESTIONNAIRE_SECTIONS` array in `src/lib/questionnaire.ts`
2. Each section has: `id`, `title`, `icon`, optional `visibleWhen` condition, and `questions[]`
3. Each question maps to a field in `LaunchFormData` via `fieldName`
4. Add the corresponding field to `LaunchFormData` in `types.ts` and `INITIAL_FORM_DATA` in `LaunchForm.tsx`
5. Add risk weights to choices — the risk calculator reads them automatically

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

### Ariane Form Design System (`ar-*` prefix)

The LaunchForm uses an Ariane-inspired design (modeled after `launch.corp.google.com/create`):

| Class | Purpose |
|-------|---------|
| `ar-section` | Section wrapper |
| `ar-section-header` | Blue ✓ circle icon + title + subtitle |
| `ar-section-body` | Indented content with left border line |
| `ar-two-col` | Two-column grid layout |
| `ar-field` / `ar-label` | Field wrapper and label above input |
| `ar-input` / `ar-textarea` | Underline-style inputs |
| `ar-choices` / `ar-choice-item` | Multi/single select option cards |
| `ar-actions` | Left-aligned action buttons |
| `ar-info-banner` | Info callout with blue ? icon |

### CSS Class Naming Conventions

- **Component-scoped**: Use a short prefix (e.g., `ar-` for Ariane form, `dt-` for DataTable)
- **Global utilities**: Use short names like `btn`, `fade-in`, `status-tag`
- **Never create ad-hoc classes** — add to `globals.css` with a section comment

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

## Risk & Review Engine

- `risk-calculator.ts` sums `riskWeight` values from questionnaire choices
- `rules-engine.ts` evaluates `DEFAULT_RULES` against form data + risk level to determine required reviews
- `permissions.ts` defines RBAC checks (not yet enforced in UI — ready for server actions)
- `state-machine.ts` defines valid launch status transitions (not yet enforced — ready for server actions)
