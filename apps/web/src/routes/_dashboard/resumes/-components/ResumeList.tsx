import Nprogress from "@/components/navigation/nprogress/Nprogress";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { cloneResumeMuationOptions } from "@/data-access-layer/resume/resume-mutatin-options";
import { listResumesPaginated } from "@/data-access-layer/resume/resume.functions";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { Route } from "..";
import { ResumeListCard } from "./ResumeListCard";

export function ResumeListPage() {
  const { sq, cursor, dir } = Route.useSearch();
  const { data, isLoading, isRefetching } = useQuery({
    queryKey: [queryKeyPrefixes.resumes, "page", cursor, dir ?? "after", sq],
    queryFn: () => listResumesPaginated({ data: { cursor, direction: dir, keyword: sq } }),
    placeholderData: (prevData) => prevData,
  });
  const cloneMutation = useMutation(cloneResumeMuationOptions);

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-6" data-test="resume-list-page">
        <RouterPendingComponent />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex w-full flex-col gap-6" data-test="resume-list-page">
        <div className="flex flex-col items-center justify-center gap-4 py-20 min-h-[min(380px,50dvh)]">
          <FileText className="text-muted-foreground size-12" />
          <p className="text-muted-foreground text-sm">No resumes yet. Create your first one!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6" data-test="resume-list-page">
      <Nprogress isAnimating={isRefetching} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-test="resume-list">
        {data.items.map((resume) => (
          <ResumeListCard
            key={resume.id}
            resume={resume}
            onClone={(id) => cloneMutation.mutate(id)}
          />
        ))}
      </div>
    </div>
  );
}
