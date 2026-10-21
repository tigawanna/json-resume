import * as Sentry from "@sentry/tanstackstart-react";
import { clientEnv } from "../env/client-env";

type SentryInitOptions = Parameters<typeof Sentry.init>[0];
export function sentryInitOptions(): SentryInitOptions {
  const dev = import.meta.env.DEV;
  return {
    dsn: clientEnv.VITE_SENTRY_DSN,
    // tracesSampleRate: dev ? 1.0 : 0,
    environment: dev ? "development" : "production",
    tracesSampleRate: 0.01, // 1% of transactions — adjust to your needs
    // autoSessionTracking: false, // GlitchTip does not support sessions
  };
}
