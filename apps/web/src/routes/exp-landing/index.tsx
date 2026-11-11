import { createFileRoute, redirect } from "@tanstack/react-router";

import { ExpLandingPage } from "./-components/exp-landing-page";

export const Route = createFileRoute("/exp-landing/")({
  component: ExpLandingPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "exp-landing", description: "Landing page experiment (scrums.com + hairline)" },
    ],
  }),
  beforeLoad: () => {
    if (process.env.NODE_ENV === "production") {
      throw redirect({ to: "/", replace: true });
    }
  },
});
