import { queryClient } from "@/lib/tanstack/query/queryclient";
import { createCollection, parseWhereExpression } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryKeyPrefixes } from "../../query-keys";
import { listEducation } from "./education.functions";

export const educationCollection = createCollection(
  queryCollectionOptions({
    id: "education-list",
    queryKey: [queryKeyPrefixes.education],
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

      return listEducation({ data: keyword ? { keyword } : undefined }) ?? [];
    },
    getKey: (item) => item.id,
    queryClient,
  }),
);
