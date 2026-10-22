import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { LogIn, RotateCcw, Settings2 } from "lucide-react";
import { CHAT_ERROR_HINTS, classifyChatError } from "../-utils/chat-error";

interface ChatErrorNoticeProps {
  message: string;
  /** Hidden for API key errors, which need settings rather than another try. */
  onRetry: () => void;
  onOpenSettings: () => void;
  retryDisabled?: boolean;
  className?: string;
}

/** A failed run's error, with the next step: retry, or change the model or key. */
export function ChatErrorNotice({
  message,
  onRetry,
  onOpenSettings,
  retryDisabled = false,
  className,
}: ChatErrorNoticeProps) {
  const kind = classifyChatError(message);
  const canRetry = kind !== "api-key" && kind !== "signed-out";
  const settingsLabel = kind === "api-key" ? "Fix key" : "Change model";
  const showSettings = kind === "api-key" || kind === "rate-limit" || kind === "daily-limit";

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-destructive/10 px-3 py-2 text-destructive",
        className,
      )}
      data-test="chat-error-notice"
      data-error-kind={kind}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-medium">{CHAT_ERROR_HINTS[kind]}</p>
        <p className="truncate text-xs opacity-80" title={message}>
          {message}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {kind === "signed-out" ? (
          <Button asChild type="button" size="sm" data-test="chat-error-sign-in">
            <Link
              to="/auth"
              search={{
                returnTo: typeof window === "undefined" ? "/" : window.location.pathname,
              }}
            >
              <LogIn className="size-3.5" />
              Sign in
            </Link>
          </Button>
        ) : null}
        {showSettings ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenSettings}
            data-test="chat-error-settings"
          >
            <Settings2 className="size-3.5" />
            {settingsLabel}
          </Button>
        ) : null}
        {canRetry ? (
          <Button
            type="button"
            size="sm"
            onClick={onRetry}
            disabled={retryDisabled}
            data-test="chat-error-retry"
          >
            <RotateCcw className="size-3.5" />
            Retry
          </Button>
        ) : null}
      </div>
    </div>
  );
}
