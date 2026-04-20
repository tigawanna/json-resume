import { queryClient } from "@/lib/tanstack/query/queryclient";
import { createCollection, parseWhereExpression } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryKeyPrefixes } from "../../query-keys";
import { listResumeProjects } from "./resume-project.functions";

export const resumeProjectsCollection = createCollection(
  queryCollectionOptions({
    id: "resume-projects-list",
    queryKey: [queryKeyPrefixes.resumeProjects],
    syncMode: "on-demand",
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

      return listResumeProjects({ data: keyword ? { keyword } : undefined }) ?? [];
    },
    getKey: (item) => item.id,
    queryClient,
  }),
);
