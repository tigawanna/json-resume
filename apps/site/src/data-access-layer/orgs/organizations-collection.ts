/**
 * Organizations Collection using TanStack DB Query Collection
 * Fetches all organizations for the current user
 * Filtering and sorting done client-side via TanStack DB select/where syntax
 */

import { authClient } from "@/lib/better-auth/client";
import { queryClient } from "@/lib/tanstack/query/queryclient";
import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";

export const organizationsCollection = createCollection(
  queryCollectionOptions({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data, error } = await authClient.organization.list();
      if (error) throw error;
      return data;
    },
    queryClient,
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const newItems = transaction.mutations.map((m) => m.modified);
      await Promise.all(
        newItems.map((payload) => {
          return async () => {
            const { data, error } = await authClient.organization.create({
              name: payload.name,
              slug: payload.slug,
              logo: payload.logo ?? undefined,
              metadata: payload.metadata,
            });
            if (error) throw error;

            return data;
          };
        }),
      );
      return { refetch: false };
    },
    onUpdate: async ({ transaction }) => {
      await Promise.all(
        transaction.mutations.map((m) => {
          return async () => {
            const { data, error } = await authClient.organization.update({
              organizationId: m.key,
              data: {
                name: m.modified.name,
                slug: m.modified.slug,
                logo: m.modified.logo ?? undefined,
                metadata: m.modified.metadata,
              },
            });
            if (error) throw error;
            return data;
          };
        }),
      );
      return { refetch: true };
    },
    onDelete: async ({ transaction }) => {
      await Promise.all(
        transaction.mutations.map((m) => {
          return async () => {
            const { error } = await authClient.organization.delete({
              organizationId: m.key,
            });
            if (error) throw error;
          };
        }),
      );
      return { refetch: true };
    },
  }),
);
