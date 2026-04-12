import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { organizationsCollection } from "@/data-access-layer/orgs/organizations-collection";
import { useAppForm } from "@/lib/tanstack/form";
import { useLiveQuery } from "@tanstack/react-db";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";

interface AddUserToOrgProps {
  orgIds?: string[];
}

const formOpts = formOptions({
  defaultValues: {
    name: "",
    email: "",
    password: "",
  },
});

export function AddUserToOrg({ orgIds }: AddUserToOrgProps) {
  const form = useAppForm({
    ...formOpts,
    defaultValues: {},
    onSubmit: async ({ value }) => {},
  });
  // add the user to the selected organizations
  const addToOrgMutation = useMutation({
    mutationFn: async () => {
      // mutation logic here
    },
  });
  const query = useLiveQuery((q) =>
    q.from({ orgs: organizationsCollection }).select(({ orgs }) => ({
      id: orgs.id,
      name: orgs.name,
      slug: orgs.slug,
      logo: orgs.logo,
      metadata: orgs.metadata,
      createdAt: orgs.createdAt,
    })),
  );

  const organizations = query.data ?? [];
  return (
    <Dialog>
      <DialogTrigger>
        <Plus />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add this user to an organization</DialogTitle>
          <DialogDescription>
            This action will add the user to the selected organization(s).
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
