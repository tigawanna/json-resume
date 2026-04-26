import { queryClient } from "@/lib/tanstack/query/queryclient";
import { createCollection, parseWhereExpression } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryKeyPrefixes } from "../../query-keys";
import { listVolunteers } from "./volunteer.functions";

export const volunteersCollection = createCollection(
  queryCollectionOptions({
    id: "volunteers-list",
    queryKey: [queryKeyPrefixes.volunteers],
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
      const result = await listVolunteers({ data: keyword ? { keyword } : undefined });
      return result?.items ?? [];
    },
    getKey: (item) => item.id,
    queryClient,
  }),
);
