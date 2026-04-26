import Nprogress from "@/components/navigation/nprogress/Nprogress";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { listContacts } from "@/data-access-layer/resume/contacts/contact.functions";
import { deleteContactMutationOptions } from "@/data-access-layer/resume/contacts/contact.mutation-options";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Contact, Loader } from "lucide-react";
import { Route } from "..";
import { ContactListCard } from "./ContactListCard";

export function ContactList() {
  const { sq, cursor, dir } = Route.useSearch();
  const { data, isLoading, isRefetching } = useQuery({
    queryKey: [queryKeyPrefixes.contacts, "page", cursor, dir ?? "after", sq],
    queryFn: () => listContacts({ data: { cursor, direction: dir, keyword: sq } }),
    placeholderData: (prevData) => prevData,
  });
  const deleteMutation = useMutation(deleteContactMutationOptions);

  if (isLoading) {
    return (
      <div className="flex w-full h-full flex-col gap-6" data-test="contact-list-page">
        <Loader className="animate-spin" />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex w-full h-full flex-col gap-6" data-test="contact-list-page">
        <div className="flex flex-col h-full items-center justify-center gap-4 py-16">
          <Contact className="text-muted-foreground size-12" />
          <p className="text-muted-foreground text-sm">
            No contacts found. Add contact information to your resumes first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full flex-col gap-6" data-test="contact-list-page">
      <Nprogress isAnimating={isRefetching} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-test="contact-list">
        {data.items.map((item) => (
          <ContactListCard
            key={item.id}
            contact={item}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}
      </div>
    </div>
  );
}
