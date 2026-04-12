/**
 * Organization Members Collection using TanStack DB Query Collection
 * Fetches all members for a specific organization
 * Filtering and sorting done client-side via TanStack DB select/where syntax
 */

import { authClient } from "@/lib/better-auth/client";
import { honoClient } from "@/lib/api/client";
import { parseParameterizedSorts, parseWhereWithHandlers } from "@/lib/tanstack/db/utils";
import { queryClient } from "@/lib/tanstack/query/queryclient";
import { createCollection, parseLoadSubsetOptions } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import type { BetterAuthUserRoles } from "@/lib/better-auth/client";

interface OrganizationMemberUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: BetterAuthUserRoles;
  createdAt: string;
  user: OrganizationMemberUser;
}

import type { PaginatedResponse } from "@/lib/api/client";

type OrganizationMembersWhereClause = {
  organizationId?: { _eq: string };
  page?: { _eq: number };
  _and?: OrganizationMembersWhereClause[];
  [key: string]: any;
};

type MembersApiResponse = PaginatedResponse<OrganizationMember> & {
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
    hasMore: boolean;
  };
};

export const organizationMembersCollection = createCollection(
  queryCollectionOptions({
    syncMode: "on-demand", // ← New!
    queryKey: ["organizations", "members"],
    queryFn: async (ctx) => {
      const loadedSubs = ctx.meta?.loadSubsetOptions;
      const { sorts } = parseLoadSubsetOptions(ctx.meta?.loadSubsetOptions);
      const { asc, desc } = parseParameterizedSorts(sorts);
      const where = parseWhereWithHandlers<OrganizationMembersWhereClause>(loadedSubs?.where);

      const organizationId = where?.organizationId?._eq as string;
      const page = (where?.page?._eq as number) || 1;

      type AdminMembersClient = typeof honoClient & {
        api: {
          "admin/organizations/:id/members": {
            $get: (opts: {
              params: { id: string };
              query: {
                page: number;
                perPage: number;
                sortBy?: string;
                sortOrder?: string;
              };
            }) => Promise<{ ok: boolean; data: MembersApiResponse; error: { message: string } | null }>;
          };
        };
      };

      const response = await (honoClient as AdminMembersClient).api[
        "admin/organizations/:id/members"
      ].$get({
        params: { id: organizationId },
        query: {
          page: page,
          perPage: loadedSubs?.limit ?? 24,
          sortBy: asc?.length ? asc[0] : desc?.length ? desc[0] : undefined,
          sortOrder: asc?.length ? "asc" : desc?.length ? "desc" : "desc",
        },
      });

      if (!response.ok) {
        throw new Error(response.error?.message ?? "Failed to fetch members");
      }

      const responseData = response.data;
      ctx.client.setQueriesData(
        {
          queryKey: ["organizations", "members", organizationId, page, "metadata"],
        },
        () => {
          const data = responseData;
          if (!data) {
            return {
              page,
              perPage: 0,
              totalItems: 0,
              totalPages: 0,
              status: "error",
            };
          }
          const { items: _items, ...metadata } = data;
          return metadata;
        },
      );
      const members = responseData?.items;
      return (members ?? []).map((member: OrganizationMember) => ({ ...member, page }));
    },
    queryClient,
    getKey: (item) => item.userId,
    onUpdate: async ({ transaction }) => {
      await Promise.all(
        transaction.mutations.map((m) => {
          const mutation = m as { modified: { organizationId: string; role: string }; key: string };
          return async () => {
            const { data, error } = await authClient.organization.updateMemberRole({
              organizationId: mutation.modified.organizationId,
              role: mutation.modified.role as any,
              memberId: mutation.key,
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
          const mutation = m as { original: { organizationId: string }; key: string };
          return async () => {
            const { error } = await authClient.organization.removeMember({
              organizationId: mutation.original.organizationId,
              memberIdOrEmail: mutation.key,
            });
            if (error) throw error;
          };
        }),
      );
      return { refetch: true };
    },
  }),
);
