import { createFileRoute, notFound } from "@tanstack/react-router";
import { ChatLabPage } from "./-components/ChatLabPage";

export const Route = createFileRoute("/_dashboard/dev/chat-lab/")({
  component: ChatLabPage,
  ssr: false,
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  head: () => ({
    meta: [
      {
        title: "Chat lab",
        description: "Résumé workbench driven by scripted replies and tool calls.",
      },
    ],
  }),
});
