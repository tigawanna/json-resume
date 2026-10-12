import { createFileRoute } from "@tanstack/react-router";
import { resumeFilteredListSearchSchema } from "../-utils/list-search";
import { ContactList } from "./-components/ContactList";

export const Route = createFileRoute("/_dashboard/contacts/")({
  component: RouteComponent,
  ssr: false,
  validateSearch: (search) => resumeFilteredListSearchSchema.parse(search),
  head: () => ({
    meta: [{ title: "Contacts", description: "Contact details in your local library." }],
  }),
});

function RouteComponent() {
  return <ContactList />;
}
