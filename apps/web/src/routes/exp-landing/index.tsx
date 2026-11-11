import { createFileRoute, redirect } from "@tanstack/react-router";

import { ExpLandingPage } from "./-components/exp-landing-page";

export const Route = createFileRoute("/exp-landing/")({
  component: ExpLandingPage,
  ssr: false,
  head: () => ({
    meta: [
      {
        title: "Whiskas",
        description: "A career brain for your résumé, cover letters and applications.",
      },
    ],
  }),
  beforeLoad: () => {
    if (process.env.NODE_ENV === "production") {
      throw redirect({ to: "/", replace: true });
    }
  },
});
