import { PublicResumeShell } from "./-components/PublicResumeShell";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/layout")({
  ssr: false,
  component: PublicResumeShell,
});
