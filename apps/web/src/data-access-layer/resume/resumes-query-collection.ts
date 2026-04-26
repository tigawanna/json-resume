import { queryClient } from "@/lib/tanstack/query/queryclient";
import { createCollection, parseLoadSubsetOptions, parseWhereExpression } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryKeyPrefixes } from "../query-keys";
import { getResume, listResumes } from "./resume.functions";
import type { ResumeDetailDTO, ResumeListItemDTO } from "./resume.types";

export const resumeCollection = createCollection(
  queryCollectionOptions<ResumeDetailDTO>({
    id: "one-resume",
    queryKey: [queryKeyPrefixes.oneResume],
    syncMode: "on-demand",
    queryFn: async (ctx) => {
      const { filters } = parseLoadSubsetOptions(ctx.meta?.loadSubsetOptions);
      const idFilter = filters.find(
        ({ field, operator }) => field.join(".") === "id" && operator === "eq",
      );
      if (!idFilter) return [];
      const resume = await getResume({ data: { id: String(idFilter.value) } });
      return resume ? [resume] : [];
    },
    getKey: (resume) => resume.id,
    queryClient,
  }),
);

export const resumesCollection = createCollection(
  queryCollectionOptions<ResumeListItemDTO>({
    id: "resumes-list",
    queryKey: [queryKeyPrefixes.resumes],
    syncMode: "on-demand",
    staleTime: 1000 * 60 * 60, // 1 hour
    queryFn: async (ctx) => {
      const where = ctx.meta?.loadSubsetOptions?.where;
      let keyword: string | undefined;

      if (where) {
        parseWhereExpression(where, {
          handlers: {
            ilike: (_field, value: unknown) => {
              if (typeof value === "string" && !keyword) {
                keyword = value.replaceAll("%", "");
              }
            },
            or: (...conditions) => conditions,
          },
        });
      }
      return listResumes({ data: keyword ? { keyword } : undefined }) ?? [];
    },
    getKey: (resume) => resume.id,
    queryClient,
  }),
);
