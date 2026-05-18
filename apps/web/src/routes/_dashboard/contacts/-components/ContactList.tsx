import Nprogress from "@/components/navigation/nprogress/Nprogress";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { listContacts } from "@/data-access-layer/resume/contacts/contact.functions";
import { deleteContactMutationOptions } from "@/data-access-layer/resume/contacts/contact.mutation-options";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { useMutation } from "@tanstack/react-query";
import { Contact, Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { Route } from "..";
import { ContactCreateFormDialog } from "./ContactCreateForm";
import { ContactListCard } from "./ContactListCard";

type PageData = Awaited<ReturnType<typeof listContacts>>;

interface ContactListProps {
  data: PageData | undefined;
  isLoading: boolean;
  isRefetching: boolean;
}

export function ContactList({ data, isLoading, isRefetching }: ContactListProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreateOpenPending, startCreateOpenTransition] = useTransition();
  const navigate = Route.useNavigate();
  const deleteMutation = useMutation(deleteContactMutationOptions);

  function openCreateDialog() {
    startCreateOpenTransition(() => {
      setCreateOpen(true);
    });
  }

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-6" data-test="contact-list-page">
        <RouterPendingComponent />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex w-full flex-col gap-6" data-test="contact-list-page">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Contact className="text-muted-foreground size-12" />
            </EmptyMedia>
            <EmptyTitle>No Contacts Yet</EmptyTitle>
            <EmptyDescription>
              You haven&apos;t added any contacts yet. Get started by adding your first contact.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center gap-2">
            <Button
              size="sm"
              onClick={openCreateDialog}
              disabled={isCreateOpenPending}
              data-test="add-contact-btn"
            >
              {isCreateOpenPending ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Plus className="mr-1 size-4" />
              )}
              {isCreateOpenPending ? "Opening..." : "Create Contact"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void navigate({
                  to: ".",
                  search: (prev) => ({ ...prev, sq: "" }),
                  replace: true,
                });
              }}
            >
              Clear filters
            </Button>
          </EmptyContent>
        </Empty>
        <ContactCreateFormDialog open={createOpen} setOpen={setCreateOpen} />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6" data-test="contact-list-page">
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
