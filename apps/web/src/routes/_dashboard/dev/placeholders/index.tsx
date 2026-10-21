import { ErrorOutput } from "@/components/wrappers/ErrorOutput";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/dev/placeholders/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div
      className="mx-auto flex w-full  min-h-screen flex-col gap-6 p-6"
      data-test="dev-placeholders"
    >
      <ErrorOutput error={{ name: "Test error", message: "This is a test error" }} />
    </div>
  );
}
