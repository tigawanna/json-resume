import { queryClient } from "@/lib/tanstack/query/queryclient";
import { createCollection, parseWhereExpression } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryKeyPrefixes } from "../../query-keys";
import { listExperiences } from "./experience.functions";

export const experiencesCollection = createCollection(
  queryCollectionOptions({
    id: "experiences-list",
    queryKey: [queryKeyPrefixes.experiences],
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

      return listExperiences({ data: keyword ? { keyword } : undefined }) ?? [];
    },
    getKey: (item) => item.id,
    queryClient,
  }),
);
