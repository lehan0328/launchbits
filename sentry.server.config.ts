// ============================================================================
// SENTRY SERVER CONFIG — Node.js server-side error tracking
// ============================================================================

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance: sample 10% of transactions in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Only send errors in production
  enabled: process.env.NODE_ENV === 'production',

  // Environment tagging
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
});
