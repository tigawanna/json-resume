import Nprogress from "@/components/navigation/nprogress/Nprogress";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { listCertifications } from "@/data-access-layer/resume/certifications/certification.functions";
import { deleteCertificationMutationOptions } from "@/data-access-layer/resume/certifications/certification.mutation-options";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Award, Loader } from "lucide-react";
import { Route } from "..";
import { CertificationListCard } from "./CertificationListCard";

export function CertificationList() {
  const { sq, cursor, dir } = Route.useSearch();
  const { data, isLoading, isRefetching } = useQuery({
    queryKey: [queryKeyPrefixes.certifications, "page", cursor, dir ?? "after", sq],
    queryFn: () => listCertifications({ data: { cursor, direction: dir, keyword: sq } }),
    placeholderData: (prevData) => prevData,
  });
  const deleteMutation = useMutation(deleteCertificationMutationOptions);

  if (isLoading) {
    return (
      <div className="flex w-full h-full flex-col gap-6" data-test="certification-list-page">
        <Loader className="animate-spin" />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex w-full h-full flex-col gap-6" data-test="certification-list-page">
        <div className="flex flex-col h-full items-center justify-center gap-4 py-16">
          <Award className="text-muted-foreground size-12" />
          <p className="text-muted-foreground text-sm">
            No certifications found. Add certifications to your resumes first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full flex-col gap-6" data-test="certification-list-page">
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
