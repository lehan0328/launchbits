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
- **Migrations**: `supabase/migrations/` — versioned SQL files managed by Supabase CLI
- **RLS policies**: included in migrations; `public.user_org_id()` SECURITY DEFINER helper
- **Key tables**: `organizations`, `users`, `launches`, `launch_owners`, `launch_reviews`, `launch_events`, `review_definitions`, `launch_subscriptions`, `slack_messages`
- **Enums**: `launch_status` (DRAFT → IN_REVIEW → APPROVED → LAUNCHED → ...), `review_status` (PENDING_REVIEW, APPROVED, FYI, ...)

```bash
# .env.local (gitignored)
NEXT_PUBLIC_SUPABASE_URL=https://bfjkiwwbivyxonsosxxd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # server-only, bypasses RLS

# Slack Integration
SLACK_CLIENT_ID=your-slack-app-client-id
SLACK_CLIENT_SECRET=your-slack-app-client-secret
SLACK_SIGNING_SECRET=your-slack-signing-secret
NEXT_PUBLIC_SLACK_CLIENT_ID=same-as-SLACK_CLIENT_ID

# Encryption (AES-256-GCM for PII like Slack tokens)
# Generate with: openssl rand -hex 32
ENCRYPTION_KEY=64-char-hex-string

# App URL for Slack message links
NEXT_PUBLIC_APP_URL=https://www.launchbits.dev

# GitHub App Integration
GITHUB_APP_ID=your-github-app-id
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your-webhook-secret
NEXT_PUBLIC_GITHUB_APP_SLUG=launchbits
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
| [server/supabase.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/server/supabase.ts) | Server Components, Server Actions, Route Handlers | Cookie-based session via `cookies()`. Subject to RLS. |
| [lib/supabase-client.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/supabase-client.ts) | Client Components (rare) | Browser-side. Currently unused after ReviewsCell removal — kept for future client-side features. |
| [server/admin.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/server/admin.ts) | Server-only admin operations | Uses `SUPABASE_SERVICE_ROLE_KEY`, **bypasses RLS**. Used for user auto-provisioning + Slack notification orchestration. |
| [server/crypto.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/server/crypto.ts) | Server-only encryption | AES-256-GCM `encrypt()`/`decrypt()` for PII (Slack bot tokens). Key from `ENCRYPTION_KEY` env var. |

### Data Access Layer — [server/db.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/server/db.ts)
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
| `getSubscribedLaunches(orgId, userId)` | `Launch[]` | Subscribed page |
| `subscribeTo(userId, launchId)` | `void` | Subscribe action |
| `unsubscribeFrom(userId, launchId)` | `void` | Unsubscribe action |
| `isSubscribed(userId, launchId)` | `boolean` | Detail page subscribe toggle |

### Server Actions — [actions.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/app/actions.ts)
All writes go through Server Actions. Each action: authenticates → validates → mutates → logs audit event → revalidates cache → redirects.

| Action | Triggers |
|--------|----------|
| `createLaunchAction(formData)` | Create launch form "Save Draft" |
| `updateLaunchAction(launchId, formData)` | Edit launch form "Save Changes" |
| `submitForReviewAction(launchId, formData)` | Create form "Request Review" |
| `approveReviewAction(reviewId, notes)` | Approve button on review bit. Checks `canReview()` with `reviewer_emails`. Triggers Slack notification. |
| `denyReviewAction(reviewId, notes)` | Request Changes button on review bit. Requires notes. Triggers Slack notification. |
| `toggleSubscriptionAction(launchId)` | Subscribe/unsubscribe toggle on detail page |
| `disconnectSlackAction()` | Settings page — removes Slack token from org. Admin-only. |
| `signOutAction()` | TopBar avatar click |

### Adding a New Query
1. Add async function to `server/db.ts`
2. Use `const supabase = await createClient()` (from `server/supabase.ts`)
3. Always scope queries by `org_id` for multi-tenancy
4. Return typed results with explicit `as` casts

### Adding a New Mutation
1. Add `'use server'` function to `actions.ts`
2. Call `getCurrentUser()` first (auth guard) — import from `@/server/db`
3. Use `server/db.ts` functions for the actual query
4. Call `addEvent(...)` to log an audit trail entry
5. Call `revalidatePath(...)` for affected routes
6. Call `redirect(...)` to navigate after completion

### Deprecated
- ~~store.ts~~ — Deleted. All data access goes through `server/db.ts`.

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
│   ├── subscribed/
│   │   ├── page.tsx             # Server wrapper
│   │   └── SubscribedClient.tsx # Client rendering
│   ├── audit/
│   │   ├── page.tsx             # Server wrapper
│   │   └── AuditLogClient.tsx   # Client (filtering, pagination)
│   ├── settings/
│   │   ├── page.tsx             # Server wrapper
│   │   └── SettingsClient.tsx   # Client (single-page, multi-section Ariane layout)
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
│   ├── LoadingSkeleton.tsx     # Reusable skeleton components (TableSkeleton, etc.)
│   ├── Sidebar.tsx
│   ├── TopBar.tsx
│   └── columns.tsx             # Column definitions ('use client')
├── contexts/
│   └── SidebarContext.tsx
├── server/                      # Server-only code
│   ├── db.ts                    # Data access layer
│   ├── supabase.ts              # Server Supabase client
│   ├── admin.ts                 # Admin client (bypasses RLS)
│   ├── crypto.ts                # AES-256-GCM encrypt/decrypt for PII
│   ├── slack-notifications.ts   # Slack notification orchestration
│   └── github-checks.ts         # GitHub Check Runs orchestration
├── middleware.ts
└── lib/                         # Shared pure logic (no I/O)
    ├── types.ts
    ├── utils.ts
    ├── labels.ts
    ├── slack.ts                 # Slack Web API client (pure fetch, no SDK)
    ├── github.ts                # GitHub API client (JWT auth, Check Runs, webhook sig)
    ├── supabase-client.ts       # Browser Supabase client
    └── ... (business logic modules)
```

### Component Reuse Rules

> **CRITICAL**: Before creating any new component, check `src/components/`. Do NOT duplicate:
>
> | Component | Usage |
> |-----------|-------|
> | `DataTable` | Any tabular data. Pair with column defs from `columns.tsx` |
> | `TableToolbar` | Sort dropdown + direction toggle + optional `filters` prop (left) + `actions` slot (right, defaults to Export). Uses `sortOptions` / `sortValue` / `onSortChange` for a real `<select>`. |
> | `SectionHeader` | Titled sections with count badge |
> | `LaunchForm` | Create + edit forms. Receives `reviewDefinitions` prop |
> | `Sidebar` / `TopBar` | Global chrome. Receive `User` prop from layout |
>
> **Sidebar «Past launches»**: Collapsible section expands to show sub-links (Launched, Exception, Cancelled). Each links to `/owned?status=STATUS`. OwnedClient reads `?status=` via `useSearchParams()` + `useEffect` to sync filter state on client-side navigation.

### Adding a New Page
1. Create `src/app/<route>/page.tsx` as an **async Server Component**
2. Call `getCurrentUser()` → redirect to `/login` if null
3. Fetch data from `db.ts`, always scoped by `user.org_id`
4. If interactivity needed, create a sibling `*Client.tsx`
5. Your page renders inside `<div className="app-content">` — do NOT add sidebar/topbar/layout wrappers

```tsx
// ✅ Correct pattern
import { getCurrentUser, getLaunches } from '@/server/db';
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
1. Define columns in [columns.tsx](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/components/columns.tsx) using `ColumnDef<T>`
2. Use `DataTable` + `TableToolbar` from `DataTable.tsx`
3. Column renderers are self-contained — no client-side data fetching in column cells

---

## 5 · Business Logic Layer (Pure TypeScript)

These modules contain zero I/O — pure functions for computation and configuration:

| File | Purpose | Key Exports |
|------|---------|-------------|
| [types.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/types.ts) | All TypeScript interfaces and type aliases | `Launch`, `User`, `LaunchReview`, `LaunchFormData`, etc. |
| [questionnaire.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/questionnaire.ts) | Questionnaire section/question config | `QUESTIONNAIRE_SECTIONS`, `isSectionVisible()` |
| [risk-calculator.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/risk-calculator.ts) | Risk level from questionnaire answers | `calculateRiskLevel(formData)` → `'LOW'` / `'MEDIUM'` / `'HIGH'` |
| [rules-engine.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/rules-engine.ts) | Policy rules → required reviews | `evaluateRequiredReviews(form, risk, defs, rules)` |
| [permissions.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/permissions.ts) | RBAC permission checks | `canReview()` enforces `reviewer_emails` (case-insensitive). Wired in `actions.ts`. |
| [state-machine.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/state-machine.ts) | Launch status FSM transitions | **Not yet wired to server actions** |
| [utils.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/utils.ts) | Formatting, label helpers, status mappers | `statusLabel()`, `formatDate()`, `relativeTime()` |
| [labels.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/labels.ts) | Display label maps | `DATA_LABELS`, `PURPOSE_LABELS`, `mapLabels()` |
| [columns.tsx](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/components/columns.tsx) | DataTable column definitions (`'use client'`) | `getOwnedColumns()`, `getPendingColumns()`, `getReviewColumns()` |
| [slack.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/slack.ts) | Slack Web API client (pure `fetch()`, no SDK) | `postMessage()`, `updateMessage()`, `lookupUserByEmail()`, `buildReviewRequestBlocks()`, `verifySlackSignature()` |

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
All styles live in [globals.css](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/app/globals.css) (~2,900 lines), organized by section comments.

### Dead Code Audits
Dead CSS is periodically audited and removed. Canonical locations:
- **Utility classes** (`text-sm`, `text-muted`, `flex`, etc.): single block around line ~1875
- **Toolbar styles** (`table-toolbar`, `sort-dropdown`, etc.): single block around line ~1595
- **Button base** (`.btn`, `.btn-primary`, etc.): single block around line ~1170

> **CRITICAL**: When adding new CSS classes, check for existing definitions first to avoid duplicates. Use `grep -n '.class-name' src/app/globals.css` before creating.

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

---

## 7 · Slack Integration Layer

### Architecture
```
User clicks "Connect" in Settings
    → Slack OAuth flow (/api/slack/oauth)
    → Token encrypted (AES-256-GCM) → stored on org row
    → Notifications fire on submit/approve/deny actions
```

### Key Files
| File | Purpose |
|------|---------|
| [lib/slack.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/slack.ts) | Pure Slack Web API wrapper (no SDK). Block Kit templates. Signature validation. |
| [server/crypto.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/server/crypto.ts) | AES-256-GCM encrypt/decrypt. Key from `ENCRYPTION_KEY` env var. |
| [server/slack-notifications.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/server/slack-notifications.ts) | Server orchestration: reads DB, decrypts token, sends messages, tracks them. Fire-and-forget safe. |
| [api/slack/events/route.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/app/api/slack/events/route.ts) | Slack Events API handler + `url_verification` challenge |
| [api/slack/interactivity/route.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/app/api/slack/interactivity/route.ts) | Button press handler (approve/deny from Slack) |
| [api/slack/oauth/route.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/app/api/slack/oauth/route.ts) | OAuth callback: exchanges code → encrypts token → stores on org |

### Notification Flow
| Action | Slack Effect |
|--------|-------------|
| `submitForReviewAction()` | Posts to each review's `reviewer_slack_channel` with approve/deny buttons |
| `approveReviewAction()` | DMs launch owner + updates the channel message to show "Approved" |
| `requestChangesAction()` | DMs launch owner + updates the channel message to show "Changes Requested" |

### Rules
- **No Slack SDK** — all calls use native `fetch()` against `https://slack.com/api/`
- **PII encryption**: Slack bot tokens are AES-256-GCM encrypted before DB storage. Never store plaintext tokens.
- **Fire-and-forget**: All `notifyReview*()` calls use `void` prefix so they don't block the server action.
- **Signature validation**: All incoming Slack requests are verified with `verifySlackSignature()` (HMAC-SHA256).
- **Admin client**: Slack notification functions use `createAdminClient()` (bypasses RLS) since they run outside user context.
- **Untyped tables**: `slack_messages` is not in Supabase generated types — use `as any` cast on `.from()` calls.

---

## 8 · GitHub Integration Layer (PR Gate)

### Architecture
```
User clicks "Connect" in Settings
    → Redirected to github.com/apps/launchbits/installations/new
    → User installs app on their repos
    → GitHub redirects to /api/github/install with installation_id
    → Stored on org row → check runs fire on submit/approve/deny
```

### Key Files
| File | Purpose |
|------|---------|
| [lib/github.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/github.ts) | Pure fetch GitHub API client. JWT auth, Check Runs create/update, webhook signature verification. |
| [server/github-checks.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/server/github-checks.ts) | Orchestration: aggregates review status → creates/updates check run on PR. |
| [api/github/webhook/route.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/app/api/github/webhook/route.ts) | Webhook handler for `pull_request`, `check_suite`, `installation` events. |
| [api/github/install/route.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/app/api/github/install/route.ts) | Installation callback: stores `github_app_installation_id` on org. |

### Check Run Logic
| Review State | Check Conclusion |
|-------------|------------------|
| All approved (excluding FYI) | ✅ `success` — PR can merge |
| Any denied/changes_requested | ❌ `failure` — PR blocked |
| Still pending | ⏳ `in_progress` — PR waiting |

### Auth Flow (GitHub App JWT)
```
1. Generate short-lived JWT (RS256, 10 min) from App ID + Private Key
2. Exchange JWT for installation-scoped access token (1 hour)
3. Use installation token for Check Runs API calls
```

### Rules
- **No Octokit SDK** — all calls use native `fetch()` against `https://api.github.com/`
- **Fire-and-forget**: `syncCheckRun()` calls use `void` prefix so they don't block server actions.
- **Webhook verification**: All incoming GitHub webhooks are verified with HMAC-SHA256 (`x-hub-signature-256`).
- **Admin client**: GitHub check functions use `createAdminClient()` (bypasses RLS) since they run outside user context.
- **Private key format**: PEM stored in env var with `\n` escapes; code does `.replace(/\\n/g, '\n')` at runtime.
- **Untyped columns**: `github_app_installation_id`, `github_repo`, `github_pr_number` are not in Supabase generated types — use `as any` cast.
