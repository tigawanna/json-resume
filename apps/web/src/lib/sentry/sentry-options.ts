export function sentryInitOptions() {
  const dev = import.meta.env.DEV;
  return {
    dsn: import.meta.env.VITE_SENTRY_DSN,
    tracesSampleRate: dev ? 1.0 : 0,
    environment: dev ? "development" : "production",
  };
}
