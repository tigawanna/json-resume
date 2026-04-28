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
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { listEducation } from "@/data-access-layer/resume/education/education.functions";
import { deleteEducationMutationOptions } from "@/data-access-layer/resume/education/education.mutation-options";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { useMutation, useQuery } from "@tanstack/react-query";
import { GraduationCap, Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { Route } from "..";
import { EducationCreateFormDilaog } from "./EducationCreateForm";
import { EducationListCard } from "./EducationListCard";

export function EducationList() {
  const { sq, cursor, dir } = Route.useSearch();
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreateOpenPending, startCreateOpenTransition] = useTransition();
  const { data, isLoading, isRefetching } = useQuery({
    queryKey: [queryKeyPrefixes.education, "page", cursor, dir ?? "after", sq],
    queryFn: () => listEducation({ data: { cursor, direction: dir, keyword: sq } }),
    placeholderData: (prevData) => prevData,
  });
  const deleteMutation = useMutation(deleteEducationMutationOptions);
  const navigate = Route.useNavigate();

  function openCreateDialog() {
    startCreateOpenTransition(() => {
      setCreateOpen(true);
    });
  }

  if (isLoading) {
    return (
      <div className="flex w-full h-full flex-col gap-6" data-test="education-list-page">
        <RouterPendingComponent />
      </div>
    );
  }
  if (!data || data.items.length === 0) {
    return (
      <div className="flex w-full h-full flex-col gap-6" data-test="education-list-page">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GraduationCap className="text-muted-foreground size-12" />
            </EmptyMedia>
            <EmptyTitle>No Education Entries Yet</EmptyTitle>
            <EmptyDescription>
              You haven&apos;t added any education entries yet. Get started by adding your first
              education entry.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center gap-2">
            <Button
              size="sm"
              onClick={openCreateDialog}
              disabled={isCreateOpenPending}
              data-test="add-education-btn"
            >
              {isCreateOpenPending ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Plus className="mr-1 size-4" />
              )}
              {isCreateOpenPending ? "Opening..." : "Create Education Entry"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void navigate({
                  to: ".",
                  search: (prev) => {
                    return {
                      ...prev,
                      sq: "",
                    };
                  },
                  replace: true,
                });
              }}
            >
              Clear filters
            </Button>
          </EmptyContent>
        </Empty>
        <EducationCreateFormDilaog open={createOpen} setOpen={setCreateOpen} />
      </div>
    );
  }

  return (
    <div className="flex w-full h-full flex-col gap-6" data-test="education-list-page">
      <Nprogress isAnimating={isRefetching} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-test="education-list">
        {data.items.map((item) => (
          <EducationListCard
            key={item.id}
            education={item}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}
      </div>
    </div>
  );
}
