import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { githubAuthMutationOptions } from "@/data-access-layer/github/auth";
import { useMutation } from "@tanstack/react-query";
import { Github, Loader } from "lucide-react";

export function ConnectGithubPrompt() {
  const mutation = useMutation(githubAuthMutationOptions);

  return (
    <Empty className="min-h-[60vh]" data-test="connect-github-prompt">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Github className="size-6" />
        </EmptyMedia>
        <EmptyTitle>Connect your GitHub account</EmptyTitle>
        <EmptyDescription>
          Sign in with GitHub to browse your repositories and pin projects for
          your resume. Your access token lets us read your public and private
          repo metadata.
        </EmptyDescription>
      </EmptyHeader>
      <Button
        onClick={() => mutation.mutate({ callbackURL: "/repos" })}
        disabled={mutation.isPending}
        className="flex items-center gap-2"
        data-test="connect-github-btn"
      >
        <Github className="size-4" />
        Login with GitHub
        {mutation.isPending && <Loader className="size-4 animate-spin" />}
      </Button>
    </Empty>
  );
}
