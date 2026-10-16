import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry Error Monitoring SDK.
 * Configured via VITE_SENTRY_DSN in environment variables.
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (dsn) {
    Sentry.init({
      dsn: dsn,
      integrations: [
        Sentry.browserTracingIntegration(),
      ],
      tracesSampleRate: 0.2,
      tracePropagationTargets: ["localhost", /^https:\/\/.*\.pages\.dev/],
      environment: import.meta.env.MODE || 'production',
      ignoreErrors: [
        // Benign browser print dialog interruptions or callback invalidations
        /Failed to execute 'print' on 'Window'/i,
        /The provided callback is not callable/i,
        /The provided callback is no longer runnable/i,
      ],
    });
    console.log('⚡ Sentry Error Monitoring initialized');
  } else {
    console.info('ℹ️ Sentry DSN not configured in VITE_SENTRY_DSN. Error Monitoring in standby mode.');
  }
}

/**
 * Capture and send exception to Sentry (or console fallback if DSN is absent).
 */
export function logErrorToSentry(error, errorInfo = {}) {
  console.error("Uncaught error:", error, errorInfo);
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(error, { extra: errorInfo });
  }
}
