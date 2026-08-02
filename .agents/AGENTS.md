# Launchbits — Project Rules

## Architecture
- **`src/server/`**: Server-only code (db.ts, supabase clients). Never import from client components.
- **`src/lib/`**: Shared pure logic (types, utils, business rules). No I/O, works everywhere.
- **`src/components/`**: Reusable UI components + column definitions. All `'use client'`.
- **`src/contexts/`**: React contexts.
- **`src/app/`**: Next.js routes. Layout renders the shell; pages render inside `<div className="app-content">`.
- Page-specific sub-components stay in their page folder as `*Client.tsx`.

## TypeScript
- **No `as any`**. Ever. If you need a type assertion, create a proper type in `types.ts`. Exception: the admin client (`supabase/admin.ts`) uses `as any` because the untyped `@supabase/supabase-js` client returns `never` for table operations.
- **No `[key: string]: unknown`** index signatures on interfaces. Define all fields explicitly.
- **No double-casts** (`x as Foo as Bar`). If TypeScript can't infer the type, the type definition needs fixing.
- **Use existing types**: `LaunchFormData`, `ReviewWithLaunch`, `Launch`, `LaunchReview` — don't create ad-hoc inline types.

## Styling
- **No inline `style={{}}` for repeated patterns**. If you use the same style object more than once, create a CSS class.
- **No hardcoded colors**. Use CSS variables from the design token system (`var(--color-primary)`, `var(--text-secondary)`, etc.).
- **No `'Google Sans'`**. Use `var(--font-heading)` or `var(--font-body)`.
- **Brand color is indigo `#4F46E5`** (`var(--color-primary)`). Never use Google Blue `#1a73e8`.
- Utility classes (flex, gap-*, mt-*, text-sm, etc.) are defined in `globals.css` — use them.

## Data & Labels
- Display label maps go in `src/lib/labels.ts`, not inline in components.
- Table column definitions go in `src/components/columns.tsx` (it's `'use client'`).
- Status → CSS class mappings use `statusTextClass()` from `DataTable.tsx`.

## Next.js
- Use `next/image` instead of `<img>` for all images.
- Use `next/link` instead of `<a>` for all internal navigation.
- Pages are `'use client'` only when they need client-side interactivity (state, effects, event handlers).
- **CRITICAL: Server/Client Boundary**. You CANNOT call a function exported from a `'use client'` file in a Server Component. `columns.tsx` is `'use client'` — never import `getOwnedColumns()` etc. in a `page.tsx`. Instead, pass data from the server page to a `*Client.tsx` wrapper component.
- **Every sidebar `<Link>` must have a corresponding page**. Missing pages cause RSC prefetch 404s → page crash.

## Supabase
- **Anon client** (`supabase/server.ts`): Used for all normal queries. Subject to RLS.
- **Admin client** (`supabase/admin.ts`): Uses `SUPABASE_SERVICE_ROLE_KEY`. Bypasses RLS. Used ONLY for user auto-provisioning in `getCurrentUser()`.
- **RLS chicken-and-egg**: New users can't query anything through the anon client because `user_org_id()` returns NULL before the user row exists. The admin client handles provisioning.
- **Env var naming**: `NEXT_PUBLIC_*` = exposed to browser. `SUPABASE_SERVICE_ROLE_KEY` = server-only, NEVER prefixed with `NEXT_PUBLIC_`.
- **Env vars needed**: `.env.local` (local), Vercel env vars (production), GitHub Secrets (CI).
