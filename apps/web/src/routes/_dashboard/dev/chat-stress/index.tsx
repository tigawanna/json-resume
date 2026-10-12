import { createFileRoute, notFound } from "@tanstack/react-router";
import { ChatStressPage } from "./-components/ChatStressPage";

export const Route = createFileRoute("/_dashboard/dev/chat-stress/")({
  component: ChatStressPage,
  ssr: false,
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  head: () => ({
    meta: [
      {
        title: "Chat stress test",
        description: "Stream a scripted reply through the résumé chat UI and log FPS.",
      },
    ],
  }),
});
