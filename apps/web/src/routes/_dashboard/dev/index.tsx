import { createFileRoute, notFound } from "@tanstack/react-router";
import { DevIndexPage } from "./-components/DevIndexPage";

export const Route = createFileRoute("/_dashboard/dev/")({
  component: DevIndexPage,
  ssr: false,
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  head: () => ({
    meta: [
      {
        title: "Dev",
        description: "Local-only pages for trying the chat UI.",
      },
    ],
  }),
});
