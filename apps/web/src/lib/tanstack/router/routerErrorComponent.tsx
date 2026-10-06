import { SiteIcon } from "@/components/icon/SiteIcon";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";
import { Link } from "@tanstack/react-router";
import { Check, Copy, RotateCw } from "lucide-react";
import { useState } from "react";

interface RouterErrorComponentProps {
  error: unknown;
}

function toRouterError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === "string") return new Error(error);
  return new Error("Unknown error");
}

export function RouterErrorComponent({ error }: RouterErrorComponentProps) {
  const resolved = toRouterError(error);
  return (
    <div
      data-test="router-error"
      className="bg-base-100 relative h-full min-h-0 w-full flex-1 overflow-y-auto"
    >
      <div className="relative flex min-h-full flex-col">
        <div className="pointer-events-none absolute inset-0 opacity-40 motion-reduce:hidden">
          <BackgroundRippleEffect rows={8} cols={12} cellSize={56} />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-base-100)_72%)]"
        />

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16">
          <RouterErrorProductionContent />
        </div>

        {import.meta.env.DEV ? <RouterErrorDevelopmentPanel error={resolved} /> : null}
      </div>
    </div>
  );
}

function RouterErrorProductionContent() {
  return (
    <div className="flex max-w-md flex-col items-center text-center">
      <SiteIcon size={96} aria-hidden />

      <h1 className="mt-8 font-serif text-4xl leading-tight tracking-[-0.03em] text-balance text-base-content md:text-5xl">
        This view hit a snag
      </h1>

      <p className="text-base-content/70 mt-5 max-w-[40ch] text-base leading-7 text-pretty">
        Your résumé JSON is still here. This screen is not. Reload, or head back and pick up where
        you left off.
      </p>

      <svg
        viewBox="0 0 400 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-primary/30 mt-10 h-5 w-full max-w-xs"
        aria-hidden="true"
      >
        <path
          d="M0 14C60 4 120 22 200 12C280 2 340 20 400 10"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          data-test="router-error-home"
          className="btn btn-primary btn-sm rounded-full px-6"
        >
          Back home
        </Link>
        <button
          type="button"
          data-test="router-error-retry"
          onClick={() => window.location.reload()}
          className="btn btn-ghost btn-sm rounded-full px-6"
        >
          <RotateCw className="size-3.5" />
          Try again
        </button>
      </div>
    </div>
  );
}

function RouterErrorDevelopmentPanel({ error }: { error: Error }) {
  const [copied, setCopied] = useState(false);

  const copyStackTrace = async () => {
    const text = error.stack ?? `${error.name}: ${error.message}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      data-test="router-error-development"
      className="border-base-content/10 bg-base-200/90 relative z-10 border-t px-4 py-5 backdrop-blur-sm"
    >
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <p className="text-base-content/50 text-xs font-medium">Development details</p>
          <button
            type="button"
            onClick={copyStackTrace}
            data-test="router-error-copy"
            className="btn btn-ghost btn-xs gap-1.5"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <p className="text-primary mt-3 font-mono text-sm">{error.name}</p>
        <p className="text-base-content/70 mt-1 font-mono text-sm leading-6">{error.message}</p>

        {error.stack ? (
          <details className="mt-4">
            <summary className="text-base-content/60 hover:text-base-content cursor-pointer text-sm">
              Stack trace
            </summary>
            <pre className="border-base-content/10 bg-base-100 mt-3 max-h-64 overflow-auto rounded-lg border p-3 font-mono text-xs leading-5">
              {error.stack}
            </pre>
          </details>
        ) : null}
      </div>
    </div>
  );
}
