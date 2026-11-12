import { useViewer } from "@/data-access-layer/auth/viewer";
import { hostedAiLoginRequired } from "@/lib/ai/hosted-ai-access";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "@tanstack/react-router";

export function useHostedAiSignedIn() {
  const { viewer } = useViewer();
  if (!hostedAiLoginRequired()) return true;
  return Boolean(viewer.user);
}

export function HostedAiSignIn({ className }: { className?: string }) {
  const pathname = useLocation({ select: (location) => location.pathname });

  return (
    <div
      className={
        className ??
        "flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-5 py-8 text-center"
      }
      data-test="hosted-ai-sign-in"
    >
      <p className="font-semibold">Sign in to use the assistant</p>
      <p className="max-w-sm text-sm text-pretty text-muted-foreground">
        This chat runs on our servers. Sign in on the web, or use the desktop app, which keeps your
        key on this machine and does not need an account.
      </p>
      <Button asChild size="sm">
        <Link to="/auth" search={{ returnTo: pathname }} data-test="hosted-ai-sign-in-link">
          Sign in
        </Link>
      </Button>
    </div>
  );
}
