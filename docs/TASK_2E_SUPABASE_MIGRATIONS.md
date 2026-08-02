# Phase 2E: Supabase Migration System Setup

> This task file contains everything needed to set up the Supabase migration system.
> It is designed to be self-contained — no external conversation context needed.

## Prerequisites
- Supabase CLI installed (`brew install supabase/tap/supabase`)
- Access to the Supabase project: `bfjkiwwbivyxonsosxxd`
- Supabase account with access token (generate at https://supabase.com/dashboard/account/tokens)

## Task

Migrate from a single `src/db/schema.sql` to versioned migration files managed by the Supabase CLI.

### Step 1: Initialize Supabase locally
```bash
cd /path/to/launchbits
supabase init
```
This creates `supabase/` directory with `config.toml`.

### Step 2: Link to remote project
```bash
supabase link --project-ref bfjkiwwbivyxonsosxxd
```
You'll need to enter the database password when prompted.

### Step 3: Create baseline migration
```bash
# Pull the current remote schema as the baseline
supabase db pull --schema public
```
This creates `supabase/migrations/<timestamp>_remote_schema.sql` with the current production schema.

Alternatively, manually create the baseline:
```bash
mkdir -p supabase/migrations
cp src/db/schema.sql supabase/migrations/00001_initial_schema.sql
cp src/db/rls_policies.sql supabase/migrations/00002_rls_policies.sql
```

### Step 4: Mark existing migrations as applied
Since the schema is already in production, mark the baseline as applied:
```bash
supabase migration repair --status applied <migration_version>
```

### Step 5: Move seed data
```bash
cp src/db/seed.sql supabase/seed.sql
```

### Step 6: Update CI workflow
In `.github/workflows/ci.yml`, add a step to push migrations on merge to main:
```yaml
- name: Push DB migrations
  if: github.ref == 'refs/heads/main'
  run: npx supabase db push --linked
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
    SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
```

### Step 7: Add GitHub Secrets
In GitHub repo settings → Secrets → Actions, add:
- `SUPABASE_ACCESS_TOKEN` — from https://supabase.com/dashboard/account/tokens
- `SUPABASE_DB_PASSWORD` — the database password for the project

### Step 8: Cleanup
After verifying migrations work:
- Delete `src/db/schema.sql` (replaced by `supabase/migrations/00001_...`)
- Delete `src/db/rls_policies.sql` (replaced by `supabase/migrations/00002_...`)
- Delete `src/db/seed.sql` (replaced by `supabase/seed.sql`)

### Future Workflow
```
Developer writes migration → PR → CI typechecks/builds → merge to main
  → GitHub Actions runs `supabase db push` → migration applied to prod DB
  → Vercel deploys the new app code
```

## Context
- The app is a Next.js launch governance platform deployed on Vercel
- Database is Supabase PostgreSQL with RLS enabled on all tables
- See `.agents/skills/launchbits-codebase/SKILL.md` for full architecture reference
- See `.agents/AGENTS.md` for project coding rules
