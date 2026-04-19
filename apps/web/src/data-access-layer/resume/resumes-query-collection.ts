import { queryClient } from "@/lib/tanstack/query/queryclient";
import { createCollection, eq, parseLoadSubsetOptions, Query } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { getResume } from "./resume.functions";

export const resumeCollection = createCollection(
  queryCollectionOptions({
    id: "resumes",
    queryKey: ["resumes"],
    syncMode: "on-demand",
    queryFn: async (ctx) => {
      const parsed = parseLoadSubsetOptions(ctx.meta?.loadSubsetOptions);
      const whereId = parsed.filters.find(
        ({ field, operator }) => field.join(".") === "id" && operator === "eq",
      );
      if (!whereId) {
        return [];
      }
      const resume = await getResume({ data: { id: whereId?.value } });
      if (!resume) {
        return [];
      }
      return [resume];
    },
    getKey: (resume) => resume.id,
    queryClient,
  }),
);

