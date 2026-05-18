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
import type { listCertifications } from "@/data-access-layer/resume/certifications/certification.functions";
import { deleteCertificationMutationOptions } from "@/data-access-layer/resume/certifications/certification.mutation-options";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { useMutation } from "@tanstack/react-query";
import { Award, Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { Route } from "..";
import { CertificationCreateFormDialog } from "./CertificationCreateForm";
import { CertificationListCard } from "./CertificationListCard";

type PageData = Awaited<ReturnType<typeof listCertifications>>;

interface CertificationListProps {
  data: PageData | undefined;
  isLoading: boolean;
  isRefetching: boolean;
}

export function CertificationList({ data, isLoading, isRefetching }: CertificationListProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreateOpenPending, startCreateOpenTransition] = useTransition();
  const navigate = Route.useNavigate();
  const deleteMutation = useMutation(deleteCertificationMutationOptions);

  function openCreateDialog() {
    startCreateOpenTransition(() => {
      setCreateOpen(true);
    });
  }

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-6" data-test="certification-list-page">
        <RouterPendingComponent />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex w-full flex-col gap-6" data-test="certification-list-page">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Award className="text-muted-foreground size-12" />
            </EmptyMedia>
            <EmptyTitle>No Certifications Yet</EmptyTitle>
            <EmptyDescription>
              You haven&apos;t added any certifications yet. Get started by adding your first
              certification.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center gap-2">
            <Button
              size="sm"
              onClick={openCreateDialog}
              disabled={isCreateOpenPending}
              data-test="add-certification-btn"
            >
              {isCreateOpenPending ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Plus className="mr-1 size-4" />
              )}
              {isCreateOpenPending ? "Opening..." : "Create Certification"}
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
        <CertificationCreateFormDialog open={createOpen} setOpen={setCreateOpen} />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6" data-test="certification-list-page">
      <Nprogress isAnimating={isRefetching} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-test="certification-list">
        {data.items.map((item) => (
          <CertificationListCard
            key={item.id}
            certification={item}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}
      </div>
    </div>
  );
}
