---
name: launchbits-codebase
description: >
  Coding standards and architecture patterns for the Launchbits Next.js application.
  Organized by tech stack layer: database, auth, backend, frontend, styling, and
  business logic. Triggers when adding new pages, components, or features.
---

# Launchbits Codebase Patterns

---

## 1 · Database Layer (Supabase / PostgreSQL)

### Schema
- **Source of truth**: [schema.sql](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/db/schema.sql) — run in Supabase SQL Editor
- **RLS policies**: [rls_policies.sql](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/db/rls_policies.sql) — org-scoped RLS on all 8 tables
- **Helper function**: `public.user_org_id()` — SECURITY DEFINER function that returns the current user's org_id
- **Seed data**: [seed.sql](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/db/seed.sql) — demo org, 4 users, 4 launches, 7 reviews, 4 events
- **Key tables**: `organizations`, `users`, `launches`, `launch_owners`, `launch_reviews`, `launch_events`, `review_definitions`
- **Enums**: `launch_status` (DRAFT → IN_REVIEW → APPROVED → LAUNCHED → ...), `review_status` (PENDING_REVIEW, APPROVED, FYI, ...)

### Environment
```bash
# .env.local (gitignored)
NEXT_PUBLIC_SUPABASE_URL=https://bfjkiwwbivyxonsosxxd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # server-only, bypasses RLS
```

---

## 2 · Auth Layer (Supabase Auth)

### Flow
```
User → /login → Google OAuth or Magic Link
  → Supabase Auth → /auth/callback → exchange code for session
  → Middleware refreshes session on every request
  → getCurrentUser() maps auth email → users table
```

### Key Files
| File | Purpose |
|------|---------|
| [middleware.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/middleware.ts) | Session refresh + route protection (redirects to `/login` if unauthenticated) |
| [login/page.tsx](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/app/login/page.tsx) | Login UI — Google OAuth button + magic link form |
| [login/layout.tsx](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/app/login/layout.tsx) | Standalone layout (no sidebar/topbar) |
| [auth/callback/route.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/app/auth/callback/route.ts) | OAuth/magic-link code exchange → redirect to app |
| [layout.tsx](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/app/layout.tsx) | Auth-aware root layout: renders app shell only if user is authenticated |

### Rules
- Protected routes: everything except `/login`, `/auth/*`, and `/setup`
- User identity: `getCurrentUser()` in `db.ts` matches `auth.email` → `users.email`
- **Auto-provisioning**: If auth user exists but no `users` row, `getCurrentUser()` auto-creates the user using the admin client (bypasses RLS)
- Sign out: `signOutAction()` Server Action in `actions.ts`

---

## 3 · Backend Layer (Data Access + Server Actions)

### Supabase Clients
| File | Context | Usage |
|------|---------|-------|
| [supabase/server.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/supabase/server.ts) | Server Components, Server Actions, Route Handlers | Cookie-based session via `cookies()`. Subject to RLS. |
| [supabase/client.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/supabase/client.ts) | Client Components (rare) | Browser-side, used only for ReviewsCell |
| [supabase/admin.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/supabase/admin.ts) | Server-only admin operations | Uses `SUPABASE_SERVICE_ROLE_KEY`, **bypasses RLS**. Only for user auto-provisioning. |

### Data Access Layer — [db.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/db.ts)
All reads go through `db.ts`. Functions are async, server-side only:

| Function | Returns | Used By |
|----------|---------|---------|
| `getCurrentUser()` | `User \| null` | Layout, all pages |
| `getLaunches(orgId)` | `Launch[]` | Dashboard, Owned |
| `getLaunchById(id)` | `Launch \| null` | Detail, Edit |
| `getReviewsForLaunch(id)` | `LaunchReview[]` | Detail |
| `getPendingReviewsForUser(orgId, userId)` | `ReviewWithLaunch[]` | Dashboard, Reviews |
| `getAllEvents(orgId)` | `LaunchEvent[]` | Audit |
| `getEventsForLaunch(id)` | `LaunchEvent[]` | Detail |
| `getReviewDefinitions(orgId)` | `ReviewDefinition[]` | Settings, Create, Edit |
| `getOrganization(orgId)` | `Organization \| null` | Settings |
| `createLaunch(orgId, userId, formData)` | `Launch \| null` | Create action |
| `updateLaunch(id, updates)` | `Launch \| null` | Update/Submit actions |
| `addReview(review)` | `LaunchReview \| null` | Submit action |
| `addEvent(...)` | `void` | All mutation actions (audit trail) |

### Server Actions — [actions.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/app/actions.ts)
All writes go through Server Actions. Each action: authenticates → validates → mutates → logs audit event → revalidates cache → redirects.

| Action | Triggers |
|--------|----------|
| `createLaunchAction(formData)` | Create launch form "Save Draft" |
| `updateLaunchAction(launchId, formData)` | Edit launch form "Save Changes" |
| `submitForReviewAction(launchId, formData)` | Create form "Request Review" |
| `signOutAction()` | TopBar avatar click |

### Adding a New Query
1. Add async function to `db.ts`
2. Use `const supabase = await createClient()` (from `supabase/server.ts`)
3. Always scope queries by `org_id` for multi-tenancy
4. Return typed results with explicit `as` casts

### Adding a New Mutation
1. Add `'use server'` function to `actions.ts`
2. Call `getCurrentUser()` first (auth guard)
3. Use `db.ts` functions for the actual query
4. Call `addEvent(...)` to log an audit trail entry
5. Call `revalidatePath(...)` for affected routes
6. Call `redirect(...)` to navigate after completion

### Deprecated
- [store.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/store.ts) — **DO NOT USE**. In-memory store kept for reference only. All imports have been removed.

---

## 4 · Frontend Layer (Next.js App Router)

### Architecture Pattern: Server Wrapper + Client Component
**CRITICAL**: Every page that renders `'use client'` components (like column definitions from `columns.tsx`) MUST follow this split. Calling a client function from a Server Component crashes in production (even if it works in dev).

```
page.tsx (Server Component — async)
  ├── Authenticates via getCurrentUser()
  ├── Fetches data via db.ts
  └── Passes data as props to:
      └── *Client.tsx (Client Component — 'use client')
          ├── Handles state, events, filtering, tabs
          ├── Calls column definition functions (getOwnedColumns etc.)
          └── Calls Server Actions for mutations
```

### File Organization
```
src/
├── app/                         # Next.js App Router
│   ├── layout.tsx               # Root layout (auth-aware shell)
│   ├── error.tsx                # Page-level error boundary
│   ├── global-error.tsx         # Root error boundary
│   ├── actions.ts               # All Server Actions
│   ├── globals.css              # All styles
│   ├── page.tsx                 # Dashboard — server wrapper
│   ├── DashboardClient.tsx      # Dashboard — client rendering
│   ├── owned/
│   │   ├── page.tsx             # Server wrapper
│   │   └── OwnedClient.tsx      # Client rendering
│   ├── reviews/
│   │   ├── page.tsx             # Server wrapper
│   │   └── ReviewsClient.tsx    # Client rendering
│   ├── drafts/page.tsx          # Placeholder (sidebar link)
│   ├── subscribed/page.tsx      # Placeholder (sidebar link)
│   ├── audit/
│   │   ├── page.tsx             # Server wrapper
│   │   └── AuditLogClient.tsx   # Client (filtering, pagination)
│   ├── settings/
│   │   ├── page.tsx             # Server wrapper
│   │   └── SettingsClient.tsx   # Client (tabs)
│   ├── login/                   # Standalone auth pages
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── auth/callback/route.ts   # OAuth callback
│   └── launches/
│       ├── new/
│       │   ├── page.tsx         # Server wrapper (fetch review defs)
│       │   └── NewLaunchClient.tsx
│       └── [id]/
│           ├── page.tsx         # Server wrapper (fetch launch + reviews + events)
│           ├── LaunchDetailClient.tsx
│           └── edit/
│               ├── page.tsx     # Server wrapper
│               └── EditLaunchClient.tsx
├── components/                  # Shared UI components
│   ├── DataTable.tsx
│   ├── LaunchForm.tsx
│   ├── Sidebar.tsx
│   └── TopBar.tsx
├── contexts/
│   └── SidebarContext.tsx
├── middleware.ts
└── lib/                         # Pure logic (see layers 3 and 5)
```

### Component Reuse Rules

> **CRITICAL**: Before creating any new component, check `src/components/`. Do NOT duplicate:
>
> | Component | Usage |
> |-----------|-------|
> | `DataTable` | Any tabular data. Pair with column defs from `columns.tsx` |
> | `TableToolbar` | Sort toggles / filters above a DataTable |
> | `SectionHeader` | Titled sections with count badge |
> | `LaunchForm` | Create + edit forms. Receives `reviewDefinitions` prop |
> | `Sidebar` / `TopBar` | Global chrome. Receive `User` prop from layout |

### Adding a New Page
1. Create `src/app/<route>/page.tsx` as an **async Server Component**
2. Call `getCurrentUser()` → redirect to `/login` if null
3. Fetch data from `db.ts`, always scoped by `user.org_id`
4. If interactivity needed, create a sibling `*Client.tsx`
5. Your page renders inside `<div className="app-content">` — do NOT add sidebar/topbar/layout wrappers

```tsx
// ✅ Correct pattern
import { getCurrentUser, getLaunches } from '@/lib/db';
import { redirect } from 'next/navigation';
import MyClient from './MyClient';

export default async function MyPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const data = await getLaunches(user.org_id);
  return <MyClient data={data} />;
}
```

### Adding a New Table View
1. Define columns in [columns.tsx](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/columns.tsx) using `ColumnDef<T>`
2. Use `DataTable` + `TableToolbar` from `DataTable.tsx`
3. Reuse `ReviewsCell` for review progress bars

---

## 5 · Business Logic Layer (Pure TypeScript)

These modules contain zero I/O — pure functions for computation and configuration:

| File | Purpose | Key Exports |
|------|---------|-------------|
| [types.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/types.ts) | All TypeScript interfaces and type aliases | `Launch`, `User`, `LaunchReview`, `LaunchFormData`, etc. |
| [questionnaire.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/questionnaire.ts) | Questionnaire section/question config | `QUESTIONNAIRE_SECTIONS`, `isSectionVisible()` |
| [risk-calculator.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/risk-calculator.ts) | Risk level from questionnaire answers | `calculateRiskLevel(formData)` → `'LOW'` / `'MEDIUM'` / `'HIGH'` |
| [rules-engine.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/rules-engine.ts) | Policy rules → required reviews | `evaluateRequiredReviews(form, risk, defs, rules)` |
| [permissions.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/permissions.ts) | RBAC permission checks | **Not yet wired to UI** |
| [state-machine.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/state-machine.ts) | Launch status FSM transitions | **Not yet wired to server actions** |
| [utils.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/utils.ts) | Formatting, label helpers, status mappers | `statusLabel()`, `formatDate()`, `relativeTime()` |
| [labels.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/labels.ts) | Display label maps | `DATA_LABELS`, `PURPOSE_LABELS`, `mapLabels()` |
| [columns.tsx](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/columns.tsx) | DataTable column definitions | `getOwnedColumns()`, `getReviewColumns()`, `ReviewsCell` |

### Adding a New Type
1. Add to `types.ts` — use union types for enums (e.g., `type Foo = 'A' | 'B'`)
2. Use explicit field definitions — never `[key: string]: unknown`
3. For joined types, extend the base with `extends` (e.g., `ReviewWithLaunch extends LaunchReview`)

### Adding a New Questionnaire Section
1. Add section to `QUESTIONNAIRE_SECTIONS` in `questionnaire.ts`
2. Add the field to `LaunchFormData` in `types.ts`
3. Add to `INITIAL_FORM_DATA` in `LaunchForm.tsx`
4. Add risk weights to choices — the risk calculator reads them automatically

---

## 6 · Styling Layer (Vanilla CSS)

### Single File
All styles live in [globals.css](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/app/globals.css) (~2,350 lines), organized by section comments.

### Design Tokens (`:root`)
```css
/* Colors */
var(--color-primary)           /* #4F46E5 indigo */
var(--color-primary-hover)     /* #4338CA */
var(--color-primary-container) /* #EEF2FF light indigo bg */

/* Text */
var(--text-primary)            /* #202124 */
var(--text-secondary)          /* #5f6368 */
var(--text-tertiary)           /* #80868b */

/* Surfaces */
var(--bg-app)                  /* #f8f9fa page bg */
var(--bg-surface)              /* white card bg */
var(--bg-surface-secondary)    /* #f1f3f4 hover bg */

/* Typography */
var(--font-heading)            /* Inter */
var(--font-body)               /* Inter */
var(--font-code)               /* Roboto Mono */

/* Spacing / Radius */
var(--radius-sm)  var(--radius-md)  var(--radius-lg)
```

### Ariane Form Design System (`ar-*` prefix)
Modeled after Google's `launch.corp.google.com/create`:

| Class | Purpose |
|-------|---------|
| `ar-section` | Section wrapper |
| `ar-section-header` | Blue ✓ circle + title + subtitle |
| `ar-section-body` | Indented content with left border |
| `ar-two-col` | Two-column grid |
| `ar-field` / `ar-label` | Field wrapper and label |
| `ar-input` / `ar-textarea` | Underline-style inputs |
| `ar-choices` / `ar-choice-item` | Multi/single select cards |
| `ar-actions` | Left-aligned action buttons |
| `ar-info-banner` | Blue info callout |

### Status Colors (semantic tokens)
```css
var(--status-draft-bg/text/border)
var(--status-pending-bg/text/border)
var(--status-approved-bg/text/border)
var(--status-blocked-bg/text/border)
var(--status-warning-bg/text/border)
var(--status-fyi-bg/text/border)
```

### Rules
- Use CSS classes over inline styles for anything repeated
- Use design token `var(--*)` over hardcoded hex values
- New component styles → add section to `globals.css` with a `/* ====== SECTION NAME ====== */` comment
- Class naming: component prefix (`ar-`, `dt-`, `login-`) for scoping, short names (`btn`, `status-tag`) for globals
