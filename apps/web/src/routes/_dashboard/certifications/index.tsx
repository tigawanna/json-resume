import { createFileRoute } from "@tanstack/react-router";
import { resumeFilteredListSearchSchema } from "../-utils/list-search";
import { CertificationList } from "./-components/CertificationList";

export const Route = createFileRoute("/_dashboard/certifications/")({
  component: RouteComponent,
  ssr: false,
  validateSearch: (search) => resumeFilteredListSearchSchema.parse(search),
  head: () => ({
    meta: [{ title: "Certifications", description: "Certifications in your local library." }],
  }),
});

function RouteComponent() {
  return <CertificationList />;
}
