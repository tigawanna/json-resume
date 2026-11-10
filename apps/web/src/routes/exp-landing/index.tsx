import { createFileRoute, redirect } from "@tanstack/react-router";

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

function ExpLandingPage() {
  return (
    <div data-test="exp-landing-page" className="min-h-dvh bg-base-100">
      <main className="mx-auto max-w-360 border-x border-border/50 px-6 py-20">
        <h1 className="font-serif text-4xl font-medium tracking-tight text-base-content">
          exp-landing
        </h1>
        <p className="mt-4 max-w-[48ch] text-muted-foreground">
          Landing page experiment. See <code>todos/exp-landing.md</code>.
        </p>
      </main>
    </div>
  );
}
