import Nprogress from "@/components/navigation/nprogress/Nprogress";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { listLanguages } from "@/data-access-layer/resume/languages/language.functions";
import { deleteLanguageMutationOptions } from "@/data-access-layer/resume/languages/language.mutation-options";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Globe, Loader } from "lucide-react";
import { Route } from "..";
import { LanguageListCard } from "./LanguageListCard";

export function LanguageList() {
  const { sq, cursor, dir } = Route.useSearch();
  const { data, isLoading, isRefetching } = useQuery({
    queryKey: [queryKeyPrefixes.languages, "page", cursor, dir ?? "after", sq],
    queryFn: () => listLanguages({ data: { cursor, direction: dir, keyword: sq } }),
    placeholderData: (prevData) => prevData,
  });
  const deleteMutation = useMutation(deleteLanguageMutationOptions);

  if (isLoading) {
    return (
      <div className="flex w-full h-full flex-col gap-6" data-test="language-list-page">
        <Loader className="animate-spin" />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex w-full h-full flex-col gap-6" data-test="language-list-page">
        <div className="flex flex-col h-full items-center justify-center gap-4 py-16">
          <Globe className="text-muted-foreground size-12" />
          <p className="text-muted-foreground text-sm">
            No languages found. Add languages to your resumes first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full flex-col gap-6" data-test="language-list-page">
      <Nprogress isAnimating={isRefetching} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-test="language-list">
        {data.items.map((item) => (
          <LanguageListCard
            key={item.id}
            language={item}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}
      </div>
    </div>
  );
}
