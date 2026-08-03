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
│   ├── github-checks.ts         # GitHub Check Runs orchestration
│   └── email-notifications.ts   # Email (Resend) notification orchestration
├── instrumentation.ts             # Sentry init hook (Node.js + Edge)
├── middleware.ts
└── lib/                         # Shared pure logic (no I/O)
    ├── types.ts
    ├── utils.ts
    ├── labels.ts
    ├── slack.ts                 # Slack Web API client (pure fetch, no SDK)
    ├── github.ts                # GitHub API client (JWT auth, Check Runs, webhook sig)
    ├── email.ts                 # Resend email client + HTML templates
    ├── rate-limit.ts            # In-memory sliding window rate limiter
    ├── database.types.ts        # Auto-generated Supabase types (supabase gen types)
    ├── supabase-client.ts       # Browser Supabase client (typed)
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

---

## 9 · Email + SLO Enforcement Layer

### Architecture
```
Real-time emails:
  submit/approve/deny actions → emailReviewRequested/emailReviewCompleted
  → decrypt Resend API key from org → POST to Resend API

SLO enforcement (daily cron):
  Vercel Cron → /api/cron/slo-check → find reviews past slo_due_at
  → mark slo_breached=true → Slack + Email warnings → audit log
```

### Key Files
| File | Purpose |
|------|---------|
| [lib/email.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/email.ts) | Pure fetch Resend client. HTML templates (review request, approval, denial, SLO warning). |
| [server/email-notifications.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/server/email-notifications.ts) | Orchestration: reads org → decrypts API key → sends emails. Mirrors slack-notifications.ts. |
| [api/cron/slo-check/route.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/app/api/cron/slo-check/route.ts) | Daily cron job. Finds breached SLOs, notifies Slack + email, logs audit events. |
| [vercel.json](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/vercel.json) | Cron schedule config: `0 9 * * *` (daily at 9 AM UTC). |

### Email Templates
| Event | Subject | Recipients |
|-------|---------|------------|
| Review requested | `[Launchbits] Review requested: {reviewName}` | Reviewer emails |
| Approved | `[Launchbits] ✅ Approved: {reviewName}` | Launch owner |
| Changes requested | `[Launchbits] ❌ Changes requested: {reviewName}` | Launch owner |
| SLO breached | `[Launchbits] ⚠️ SLO breached: {reviewName}` | Reviewer emails |

### Rules
- **No Resend SDK** — all calls use native `fetch()` against `https://api.resend.com/emails`
- **PII encryption**: Resend API keys are AES-256-GCM encrypted before DB storage (same as Slack tokens).
- **Fire-and-forget**: All `emailReview*()` calls use `void` prefix.
- **Vercel Hobby plan**: Cron limited to once per day. Schedule is `0 9 * * *` (daily). Upgrade to Pro for hourly.
- **Cron auth**: Protected by `CRON_SECRET` bearer token (auto-generated by Vercel).
- **SLO fires once**: Sets `slo_breached=true` after first notification to prevent re-firing.
- **Settings UI**: Integrations section is now the **first** section in Settings for visibility.
- **Untyped columns**: `email_resend_api_key_encrypted`, `email_from_address` — **resolved in Sprint D** (all types now generated).

---

## 10 · Supabase Generated Types (Sprint D)

### How It Works
```bash
npx supabase gen types typescript --project-id bfjkiwwbivyxonsosxxd > src/lib/database.types.ts
```

### Key Files
| File | Purpose |
|------|---------|
| [database.types.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/database.types.ts) | 791-line auto-generated types from live Supabase schema |
| [supabase.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/server/supabase.ts) | `createServerClient<Database>(...)` |
| [admin.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/server/admin.ts) | `createClient<Database>(...)` |
| [supabase-client.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/supabase-client.ts) | `createBrowserClient<Database>(...)` |

### Rules
- **Zero `as any` casts** — all `.from()` calls are fully typed after Sprint D.
- **Regenerate after schema changes**: Run the gen command above whenever DB schema changes.
- **Supabase CLI blocked on corp machines**: Use the [Sprint D script](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/scripts/) or run from a personal device.

---

## 11 · Rate Limiting (Sprint E)

### Architecture
```
Incoming request → extract IP from x-forwarded-for
→ check in-memory sliding window Map
→ if exceeded: 429 + X-RateLimit-* headers
→ if allowed: proceed to route handler
```

### Key File
| File | Purpose |
|------|---------|
| [rate-limit.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/lib/rate-limit.ts) | Sliding window rate limiter + route presets |

### Route Limits
| Route | Limit | Preset Function |
|-------|-------|-----------------|
| Slack Events | 100 req/min | `rateLimitWebhook()` |
| Slack Interactivity | 60 req/min | `rateLimitInteractivity()` |
| Slack OAuth | 10 req/min | `rateLimitAuth()` |
| GitHub Webhook | 100 req/min | `rateLimitWebhook()` |
| GitHub Install | 10 req/min | `rateLimitAuth()` |

### Rules
- **Per-instance**: Vercel serverless = each instance has its own Map. For global rate limiting, use Vercel KV.
- **Auto-cleanup**: Expired entries cleaned every 60s.
- **Always first**: Rate limit check runs before body parsing or signature verification.

---

## 12 · Sentry Error Monitoring (Sprint F)

### Architecture
```
Browser errors → sentry.client.config.ts → Sentry
Server errors → sentry.server.config.ts → Sentry (via instrumentation.ts)
Edge/middleware → sentry.edge.config.ts → Sentry (via instrumentation.ts)
Unhandled errors → global-error.tsx → Sentry.captureException()
Catch blocks → explicit Sentry.captureException(err)
```

### Key Files
| File | Purpose |
|------|---------|
| `sentry.client.config.ts` | Browser-side: errors + session replay (1%/100% on error) |
| `sentry.server.config.ts` | Server-side: API route + server action errors |
| `sentry.edge.config.ts` | Edge runtime: middleware errors |
| [instrumentation.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/instrumentation.ts) | Next.js instrumentation hook |
| [next.config.ts](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/next.config.ts) | `withSentryConfig()` wrapper |
| [global-error.tsx](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/src/app/global-error.tsx) | UI error boundary + Sentry capture |

### Env Vars
| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry ingest URL (required) |
| `SENTRY_ORG` | `launchbits` |
| `SENTRY_PROJECT` | `javascript-nextjs-aw` |
| `SENTRY_AUTH_TOKEN` | For source map uploads (optional) |

### Rules
- **Production only**: `enabled: process.env.NODE_ENV === 'production'`
- **All catch blocks** in server orchestration files call `Sentry.captureException(err)` before `console.error()`.
- **Console.error preserved**: Sentry supplements, doesn't replace, console logging.

---

## 13 · CI/CD Notes

### GitHub Actions
- **Use `npm install`**, NOT `npm ci`. The lockfile generated on macOS excludes Linux-specific optional native deps (`@emnapi`), causing `npm ci` to fail on the Linux CI runner.
- Workflow: [ci.yml](file:///Users/lehanouyang/.gemini/antigravity-ide/scratch/launchbits/.github/workflows/ci.yml)

### Vercel
- Deploys automatically on push to `main` via Git integration.
- **Cron**: Configured in `vercel.json` (daily SLO check). `CRON_SECRET` auto-generated by Vercel.
