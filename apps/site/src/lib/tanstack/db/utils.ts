import { ParsedOrderBy, parseWhereExpression } from "@tanstack/db";
import { BasicExpression } from "node_modules/@tanstack/db/dist/esm/query/ir";

type SortDirection = { asc?: string[]; desc?: string[] };

export function parseParameterizedSorts(sorts: ParsedOrderBy[]) {
  const objectifiedSorts = sorts.reduce((acc: SortDirection, sort) => {
    if (!acc[sort.direction])
      return {
        [sort.direction]: sort.field,
      };
    acc[sort.direction]?.push(...(sort.field as string[]));
    return acc;
  }, {});
  return objectifiedSorts;
}

export type WhereClause = {
  [key: string]: any;
  _and?: WhereClause[];
  _or?: WhereClause[];
};

export function parseWhereWithHandlers<T extends WhereClause>(
  whereExression?: BasicExpression<boolean> | undefined,
) {
  const where = parseWhereExpression<T>(whereExression, {
    handlers: {
      // @ts-expect-error it's all good man
      eq: (field, value) => ({ [field.join("_")]: { _eq: value } }),
      and: (...conditions) => {
        // Hoist nested conditions to top level by merging them
        return conditions.reduce((acc, condition) => {
          return { ...acc, ...condition };
        }, {});
      },
      or: (...conditions) => {
        // Hoist nested conditions to top level by merging them
        return conditions.reduce((acc, condition) => {
          return { ...acc, ...condition };
        }, {});
      },
    },
  });
  return where;
}
