import { getTanstackQueryContext } from "@/lib/tanstack/query/query-provider";
import { BasicIndex, createCollection, parseWhereExpression } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryKeyPrefixes } from "../query-keys";
import { queryOptions } from "@tanstack/react-query";

function makeSampleData(from: number = 1, to: number = 100) {
  const items = [];
  for (let i = from; i <= to; i++) {
    items.push({ id: `${i}`, name: `Item ${i}` });
  }
  return items;
}

function generateLstFromCursor({ cursor, pageSize }: { cursor?: string; pageSize: number }) {
  const allItems = makeSampleData();

  let startIndex = 0;

  if (cursor) {
    // Parse cursor to get numeric value
    const cursorNum = parseInt(cursor, 10);

    if (!isNaN(cursorNum)) {
      // Find first item where numeric value > cursor value
      startIndex = allItems.findIndex((item) => {
        const itemNum = parseInt(item.id, 10);
        return itemNum > cursorNum;
      });

      // If not found, return empty
      if (startIndex === -1) {
        return {
          items: [],
          nextCursor: undefined,
        };
      }
    }
  }

  const items = allItems.slice(startIndex, startIndex + pageSize).sort((a, b) => {
    const aNum = parseInt(a.id, 10);
    const bNum = parseInt(b.id, 10);
    return aNum - bNum;
  });

  return {
    items,
    nextCursor: items.length > 0 ? items[items.length - 1].id : undefined,
  };
}

type ExperimentMeta = {
  nextCursor: string | undefined;
};

export const experimentsCollectionMetaQueryOptions = queryOptions({
  queryKey: [queryKeyPrefixes.experiments, "pagination", "meta"],
  queryFn: async () => {
    const meta: ExperimentMeta = {
      nextCursor: undefined,
    };
    return meta;
  },
});
export const experimentsCollection = createCollection(
  queryCollectionOptions({
    id: "experiments-list",
    queryKey: [queryKeyPrefixes.experiments, "pagination"],
    syncMode: "on-demand",
    defaultIndexType: BasicIndex,
    autoIndex: "eager",
    queryFn: async (ctx) => {
      const where = ctx.meta?.loadSubsetOptions?.where;

      let keyword: string | undefined;
      let gtValue: unknown;

      if (where) {
        parseWhereExpression(where, {
          handlers: {
            gt: (_field, value) => {
              gtValue = value;
            },
            ilike: (_field, value: unknown) => {
              if (typeof value === "string" && !keyword) {
                keyword = value.replaceAll("%", "");
              }
            },
            or: (...conditions) => conditions,
          },
        });
      }
      let items = generateLstFromCursor({ cursor: gtValue as string | undefined, pageSize: 12 });

      ctx.client.setQueryData(experimentsCollectionMetaQueryOptions.queryKey, {
        nextCursor: items.nextCursor,
      });

      return items;
    },
    select: (item) => item.items,
    getKey: (item) => item.id,
    queryClient: getTanstackQueryContext().queryClient,
  }),
);
