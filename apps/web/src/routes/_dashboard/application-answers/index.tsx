import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { eventSourcedListSearchSchema } from "../-utils/list-search";
import { ApplicationAnswerList } from "./-components/ApplicationAnswerList";

const searchSchema = eventSourcedListSearchSchema.extend({
  /** Only the answers for this job's application. */
  jobId: z.string().optional(),
});

export const Route = createFileRoute("/_dashboard/application-answers/")({
  component: RouteComponent,
  ssr: false,
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      {
        title: "Application answers",
        description: "Answers to job application questions, reusable across applications.",
      },
    ],
  }),
});

function RouteComponent() {
  return <ApplicationAnswerList />;
}
