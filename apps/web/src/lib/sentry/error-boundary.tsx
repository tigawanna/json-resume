import { RouterErrorComponent } from "@/lib/tanstack/router/routerErrorComponent";
import * as Sentry from "@sentry/tanstackstart-react";
import { useEffect } from "react";

export function SentryErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <Sentry.ErrorBoundary
      fallback={(fallbackProps) => (
        <RouterErrorComponent
          error={fallbackProps.error}
          resetError={() => {
            fallbackProps.resetError();
          }}
        />
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}

export function SentryRouterErrorComponent({
  error,
  reset,
}: {
  error: unknown;
  reset?: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <RouterErrorComponent
      error={error}
      resetError={
        reset
          ? () => {
              reset();
            }
          : undefined
      }
    />
  );
}
