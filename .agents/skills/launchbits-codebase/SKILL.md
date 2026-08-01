---
name: launchbits-codebase
description: >
  Coding standards and architecture patterns for the Launchbits Next.js application.
  Covers file organization, component patterns, type safety, styling conventions,
  data layer with Supabase, and auth patterns. Triggers when adding new pages,
  components, or features.
---

# Launchbits Codebase Patterns

## File Organization

```
src/
├── app/                         # Next.js App Router pages
│   ├── layout.tsx               # Root layout (auth-aware: TopBar + Sidebar if logged in)
│   ├── page.tsx                 # Dashboard (home) — server component
│   ├── actions.ts               # Server Actions (createLaunch, updateLaunch, submitForReview, signOut)
│   ├── error.tsx                # Error boundary
│   ├── not-found.tsx            # 404 page
│   ├── loading.tsx              # Loading skeleton
│   ├── globals.css              # All styles (design tokens → utilities → components)
│   ├── login/                   # Auth pages (standalone, no app shell)
│   │   ├── page.tsx             # Login with Google OAuth + magic link
│   │   └── layout.tsx           # Minimal layout (no sidebar/topbar)
│   ├── auth/callback/route.ts   # OAuth/magic-link callback handler
│   ├── owned/page.tsx           # "Owned by you" view
│   ├── reviews/page.tsx         # "Pending your approval" view
│   ├── audit/
│   │   ├── page.tsx             # Server wrapper (data fetch)
│   │   └── AuditLogClient.tsx   # Client component (filtering/pagination)
│   ├── settings/
│   │   ├── page.tsx             # Server wrapper (data fetch)
│   │   └── SettingsClient.tsx   # Client component (tabs)
│   └── launches/
│       ├── new/
│       │   ├── page.tsx         # Server wrapper (fetch review defs)
│       │   └── NewLaunchClient.tsx # Client form with Server Actions
│       └── [id]/
│           ├── page.tsx         # Server wrapper (fetch launch + reviews + events)
│           ├── LaunchDetailClient.tsx # Client detail view
│           └── edit/
│               ├── page.tsx     # Server wrapper (fetch launch + review defs)
│               └── EditLaunchClient.tsx # Client form with Server Actions
├── components/                  # Reusable UI components
│   ├── DataTable.tsx            # Generic table (ColumnDef, TableToolbar, SectionHeader)
│   ├── LaunchForm.tsx           # Shared create/edit form (Ariane-style, questionnaire, risk)
│   ├── Sidebar.tsx              # App sidebar navigation (receives User prop)
│   └── TopBar.tsx               # Global header bar (receives User prop, sign out)
├── contexts/                    # React contexts (client-side only)
│   └── SidebarContext.tsx       # Sidebar collapse/expand state
├── db/
│   ├── schema.sql               # PostgreSQL schema (run in Supabase SQL Editor)
│   └── seed.sql                 # Demo data (run after schema.sql)
├── middleware.ts                 # Auth session refresh + route protection
└── lib/                         # Pure logic, data, types (no JSX except columns.tsx)
    ├── types.ts                 # All TypeScript interfaces and type aliases
    ├── db.ts                    # Data access layer (async Supabase queries)
    ├── store.ts                 # DEPRECATED: in-memory store (kept for reference only)
    ├── supabase/
    │   ├── server.ts            # Server-side Supabase client (uses cookies())
    │   └── client.ts            # Browser-side Supabase client (for client components)
    ├── utils.ts                 # Formatting, label helpers, status mappers
    ├── labels.ts                # Display label maps (data classification, network, etc.)
    ├── columns.tsx              # Shared DataTable column definitions + ReviewsCell
    ├── questionnaire.ts         # Questionnaire section/question configuration
    ├── risk-calculator.ts       # Risk level computation from questionnaire answers
    ├── rules-engine.ts          # Policy rules → required reviews evaluation
    ├── permissions.ts           # RBAC permission checks (not yet enforced in UI)
    └── state-machine.ts         # Launch status FSM transitions (not yet enforced)
```

## Architecture: Server/Client Component Split

Every page that needs data follows the **Server Wrapper + Client Component** pattern:

```
page.tsx (Server Component)
  └── fetches data from db.ts
  └── passes data as props to:
      └── *Client.tsx (Client Component)
          └── handles interactivity (state, events, forms)
          └── calls Server Actions for mutations
```

### Why?
- Data fetching happens server-side (no client-side API calls, no loading spinners)
- Client components receive serializable data as props
- Mutations use Next.js Server Actions (defined in `app/actions.ts`)

## Component Reuse Rule

> **CRITICAL**: Before creating any new component, check if a reusable component
> already exists in `src/components/`. If it does, USE IT. Do not duplicate
> functionality. The existing components are:
>
> - **`DataTable`** — for any tabular data display. Always pair with column
>   definitions from `src/lib/columns.tsx`.
> - **`TableToolbar`** — for sort toggles and filter controls above a DataTable.
> - **`SectionHeader`** — for titled sections with a count badge and "View all" link.
> - **`LaunchForm`** — for create and edit launch forms. Receives `reviewDefinitions`
>   as a prop (server-fetched). Do NOT build a new form.
> - **`Sidebar`** / **`TopBar`** — global chrome (receive `User` prop from layout).

## Adding a New Page

1. Create `src/app/<route>/page.tsx` as an **async Server Component**
2. Fetch data using functions from `src/lib/db.ts`
3. If the page needs interactivity, create a `*Client.tsx` alongside it
4. Do NOT add `<Sidebar>`, `app-layout`, or `<main>` wrapper — layout.tsx handles that
5. Your page renders inside `<div className="app-content">` only

```tsx
// ✅ Correct — Server Component + data fetch
import { getCurrentUser, getLaunches } from '@/lib/db';
import { redirect } from 'next/navigation';
import MyPageClient from './MyPageClient';

export default async function MyPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const data = await getLaunches(user.org_id);
  return <MyPageClient data={data} />;
}
```

## Data Layer (Supabase)

All data access goes through `src/lib/db.ts` (server-side) or `src/lib/supabase/client.ts` (browser-side, rare).

### Server-side (db.ts) — preferred
```tsx
import { getCurrentUser, getLaunches, getLaunchById } from '@/lib/db';

// Always async, always in Server Components or Server Actions
const user = await getCurrentUser();
const launches = await getLaunches(user.org_id);
```

### Browser-side (rare — only for ReviewsCell in columns.tsx)
```tsx
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
const { data } = await supabase.from('launches').select('*');
```

### Server Actions (mutations)
```tsx
import { createLaunchAction, updateLaunchAction } from '@/app/actions';

// Call from Client Components — they handle auth, validation, audit logging, redirect
await createLaunchAction(formData);
```

## Auth Pattern

- **Supabase Auth** handles authentication (Google OAuth + Magic Link)
- **Middleware** (`src/middleware.ts`) refreshes sessions and protects all routes except `/login` and `/auth/*`
- **Root Layout** (`layout.tsx`) checks auth and conditionally renders the app shell
- **getCurrentUser()** in `db.ts` maps Supabase Auth user → app users table by email
- **signOutAction()** in `actions.ts` signs out and redirects to login

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

## Risk & Review Engine

- `risk-calculator.ts` sums `riskWeight` values from questionnaire choices
- `rules-engine.ts` evaluates `DEFAULT_RULES` against form data + risk level to determine required reviews
- `permissions.ts` defines RBAC checks (not yet enforced in UI — ready for server actions)
- `state-machine.ts` defines valid launch status transitions (not yet enforced — ready for server actions)

## Phase 2 TODO

- Row Level Security (RLS) on all Supabase tables
- Role-based permission enforcement in UI
- State machine enforcement in server actions
- Real-time sidebar counts via Supabase subscriptions
