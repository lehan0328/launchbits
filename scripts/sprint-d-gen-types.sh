#!/bin/bash
# ============================================================================
# Sprint D: Generate Supabase Types
#
# Run this from another device where Supabase CLI is not blocked.
# Prerequisites: npm, npx, git
#
# Usage:
#   git pull origin main
#   chmod +x scripts/sprint-d-gen-types.sh
#   ./scripts/sprint-d-gen-types.sh
# ============================================================================

set -e

PROJECT_ID="bfjkiwwbivyxonsosxxd"
OUTPUT_FILE="src/lib/database.types.ts"

echo "🔧 Sprint D: Generating Supabase types..."
echo ""

# Step 1: Generate types from live schema
echo "Step 1: Generating TypeScript types from Supabase project ${PROJECT_ID}..."
npx -y supabase gen types typescript --project-id "$PROJECT_ID" > "$OUTPUT_FILE"

if [ ! -s "$OUTPUT_FILE" ]; then
  echo "❌ Failed to generate types. You may need to login first:"
  echo "   npx supabase login"
  echo "   Then re-run this script."
  exit 1
fi

echo "✅ Types written to ${OUTPUT_FILE}"
echo ""

# Step 2: Update the Supabase client files to use generated types
echo "Step 2: Updating supabase client files..."

# Update server/supabase.ts
cat > /tmp/supabase-patch.ts << 'PATCH'
// Add this import at the top of src/server/supabase.ts:
import type { Database } from '@/lib/database.types';

// Change createServerClient() to:
// createServerClient<Database>(...)
PATCH

echo "📝 Manual steps needed after running this script:"
echo ""
echo "  1. Add this import to src/server/supabase.ts:"
echo "     import type { Database } from '@/lib/database.types';"
echo ""
echo "  2. Change createServerClient( to createServerClient<Database>( in supabase.ts"
echo ""
echo "  3. Add this import to src/server/admin.ts:"
echo "     import type { Database } from '@/lib/database.types';"
echo ""
echo "  4. Change createClient( to createClient<Database>( in admin.ts"
echo ""
echo "  5. Remove all 'as any' casts from .from() calls in these files:"
echo "     - src/app/actions.ts"
echo "     - src/server/github-checks.ts"
echo "     - src/server/slack-notifications.ts"
echo "     - src/server/email-notifications.ts"
echo "     - src/app/api/github/webhook/route.ts"
echo "     - src/app/api/github/install/route.ts"
echo "     - src/app/api/cron/slo-check/route.ts"
echo "     - src/app/settings/SettingsClient.tsx"
echo ""
echo "  6. Run: npx tsc --noEmit"
echo "     If there are type errors, the generated types may not include"
echo "     columns added manually. In that case, keep 'as any' for those."
echo ""
echo "  7. Commit and push:"
echo "     git add -A"
echo "     git commit -m 'feat: add Supabase generated types (Sprint D)'"
echo "     git push origin main"
echo ""
echo "Done! 🎉"
