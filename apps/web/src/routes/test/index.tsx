import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/test/")({
  component: RouteComponent,
  ssr: false,
  head: () => ({
    meta: [{ title: "Test Route", description: "A test route for development" }],
  }),
  beforeLoad: () => {
    if (process.env.NODE_ENV === "production") {
      throw redirect({
        to: "/",
        replace: true,
      });
    }
  },
});

function RouteComponent() {
  return (
    <div>
      <RouterPendingComponent />
    </div>
  );
}
