import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  experimental: {
    // Client-side Router Cache — cache dynamic page data for 30s so
    // navigating back to a recently visited page is instant.
    // Server Actions calling revalidatePath() still invalidate immediately.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry build options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Suppress source map upload warnings when SENTRY_AUTH_TOKEN is not set
  silent: !process.env.SENTRY_AUTH_TOKEN,

  // Upload source maps for readable stack traces
  widenClientFileUpload: true,

  // Route handler & middleware automatic instrumentation
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,
  autoInstrumentAppDirectory: true,

  // Delete source maps after upload (keep them from client bundles)
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Disable Sentry telemetry
  disableLogger: true,

  // Automatically tree-shake Sentry logger in production
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
  },
});
