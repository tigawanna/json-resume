import { authClient } from "@/lib/better-auth/client";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { queryKeyPrefixes } from "../query-keys";

// ============================================================================
// Query Options
// ============================================================================

type TUserOrgsInput = NonNullable<Parameters<typeof authClient.organization.list>[0]>;
export const userOrgsQueryOptions = (input: TUserOrgsInput) =>
  queryOptions({
    queryKey: [queryKeyPrefixes.organizations] as const,
    queryFn: async () => {
      const { data, error } = await authClient.organization.list(input);
      if (error) throw error;
      return data;
    },
  });

type TActiveOrganizationInput = NonNullable<
  Parameters<typeof authClient.organization.getActiveMember>[0]
>;
export const activeOrganizationQueryOptions = queryOptions({
  queryKey: [queryKeyPrefixes.organizations, "active", "member"] as const,
  queryFn: async () => {
    const { data, error } = await authClient.organization.getActiveMember();
    if (error) throw error;
    return data;
  },
});

type TActiveOrganizationRoleInput = NonNullable<
  Parameters<typeof authClient.organization.getActiveMemberRole>[0]
>;
export const activeOrganizationRoleQueryOptions = (props: TActiveOrganizationRoleInput) =>
  queryOptions({
    queryKey: [queryKeyPrefixes.organizations, "active", "role", ...Object.values(props)] as const,
    queryFn: async () => {
      const { data, error } = await authClient.organization.getActiveMemberRole(props);
      if (error) throw error;
      return data;
    },
  });

type TFullOrganizationInput = NonNullable<
  Parameters<typeof authClient.organization.getFullOrganization>[0]
>;
export const fullOrganizationQueryOptions = ({ query }: TFullOrganizationInput) =>
  queryOptions({
    queryKey: [
      queryKeyPrefixes.organizations,
      "full",
      query?.organizationId,
      query?.organizationSlug,
    ] as const,
    queryFn: async () => {
      const { data, error } = await authClient.organization.getFullOrganization({
        query: {
          organizationId: query?.organizationId,
          organizationSlug: query?.organizationSlug,
          membersLimit: query?.membersLimit,
        },
      });
      if (error) throw error;
      return data;
    },
  });

type TOrganizationMembersInput = NonNullable<
  Parameters<typeof authClient.organization.listMembers>[0]
>;
// organization members query moved to ./organization-members

// NOTE: The following role/permission queries may require dynamic access control plugin enabled
// type TListRolesInput = NonNullable<
//   Parameters<typeof authClient.organization.listRoles>[0]
// >;
// export const organizationRolesQueryOptions = ({ query }: TListRolesInput) =>
//   queryOptions({
//     queryKey: [queryKeyPrefixes.organizations, "roles", query?.organizationId] as const,
//     queryFn: async () => {
//       const { data, error } = await authClient.organization.listRoles({
//         query: {
//           organizationId: query?.organizationId,
//         },
//       });
//       if (error) throw error;
//       return data;
//     },
//   });

// type TGetRoleInput = NonNullable<
//   Parameters<typeof authClient.organization.getRole>[0]
// >;
// export const organizationRoleQueryOptions = ({ query }: TGetRoleInput) =>
//   queryOptions({
//     queryKey: [
//       queryKeyPrefixes.organizations,
//       "roles",
//       "single",
//       query?.organizationId,
//       query?.roleName,
//       query?.roleId,
//     ] as const,
//     queryFn: async () => {
//       const { data, error } = await authClient.organization.getRole({
//         query: {
//           organizationId: query?.organizationId,
//           roleName: query?.roleName,
//           roleId: query?.roleId,
//         },
//       });
//       if (error) throw error;
//       return data;
//     },
//   });

// ============================================================================
// Mutation Options
// ============================================================================

// Organization CRUD Mutations

export type TCreateOrganizationInput = NonNullable<Parameters<typeof authClient.organization.create>[0]>;
export const createOrganizationMutationOptions = mutationOptions({
  mutationFn: async (payload: TCreateOrganizationInput) => {
    const { data, error } = await authClient.organization.create(payload);
    if (error) throw error;
    return data;
  },
  meta: {
    invalidates: [[queryKeyPrefixes.organizations]],
  },
});

export type TUpdateOrganizationInput = NonNullable<Parameters<typeof authClient.organization.update>[0]>;
export const updateOrganizationMutationOptions = mutationOptions({
  mutationFn: async (payload: TUpdateOrganizationInput) => {
    const { data, error } = await authClient.organization.update(payload);
    if (error) throw error;
    return data;
  },
  meta: {
    invalidates: [[queryKeyPrefixes.organizations, "full"]],
  },
});

type TDeleteOrganizationInput = NonNullable<Parameters<typeof authClient.organization.delete>[0]>;
export const deleteOrganizationMutationOptions = mutationOptions({
  mutationFn: async (payload: TDeleteOrganizationInput) => {
    const { data, error } = await authClient.organization.delete(payload);
    if (error) throw error;
    return data;
  },
  meta: {
    invalidates: [[queryKeyPrefixes.organizations]],
  },
});

type TCheckSlugInput = NonNullable<Parameters<typeof authClient.organization.checkSlug>[0]>;
export const checkOrgSlugMutationOptions = mutationOptions({
  mutationFn: async (payload: TCheckSlugInput) => {
    const { data, error } = await authClient.organization.checkSlug(payload);
    if (error) throw error;
    return data;
  },
});

// Active Organization Mutations

type TSetActiveOrganizationInput = NonNullable<
  Parameters<typeof authClient.organization.setActive>[0]
>;
export const setActiveOrganizationMutationOptions = mutationOptions({
  mutationFn: async (payload: TSetActiveOrganizationInput) => {
    const { data, error } = await authClient.organization.setActive(payload);
    if (error) throw error;
    return data;
  },
  meta: {
    invalidates: [[queryKeyPrefixes.organizations, "active"]],
  },
});

// Member Mutations

type TRemoveMemberInput = NonNullable<Parameters<typeof authClient.organization.removeMember>[0]>;
// remove member mutation moved to ./organization-members

type TUpdateMemberRoleInput = NonNullable<
  Parameters<typeof authClient.organization.updateMemberRole>[0]
>;
// update member role mutation moved to ./organization-members

type TLeaveOrganizationInput = NonNullable<Parameters<typeof authClient.organization.leave>[0]>;
export const leaveOrganizationMutationOptions = mutationOptions({
  mutationFn: async (payload: TLeaveOrganizationInput) => {
    const { data, error } = await authClient.organization.leave(payload);
    if (error) throw error;
    return data;
  },
  meta: {
    invalidates: [[queryKeyPrefixes.organizations], [queryKeyPrefixes.organizations, "members"]],
  },
});

// Permission Mutations

type THasPermissionInput = NonNullable<Parameters<typeof authClient.organization.hasPermission>[0]>;
export const checkPermissionMutationOptions = mutationOptions({
  mutationFn: async (payload: THasPermissionInput) => {
    const { data, error } = await authClient.organization.hasPermission(payload);
    if (error) throw error;
    return data;
  },
});

// NOTE: The following role mutations may require dynamic access control plugin enabled
// type TCreateRoleInput = NonNullable<
//   Parameters<typeof authClient.organization.createRole>[0]
// >;
// export const createRoleMutationOptions = mutationOptions({
//   mutationFn: async (payload: TCreateRoleInput) => {
//     const { data, error } = await authClient.organization.createRole(payload);
//     if (error) throw error;
//     return data;
//   },
//   meta: {
//     invalidates: [[queryKeyPrefixes.organizations, "roles"]],
//   },
// });

// type TUpdateRoleInput = NonNullable<
//   Parameters<typeof authClient.organization.updateRole>[0]
// >;
// export const updateRoleMutationOptions = mutationOptions({
//   mutationFn: async (payload: TUpdateRoleInput) => {
//     const { data, error } = await authClient.organization.updateRole(payload);
//     if (error) throw error;
//     return data;
//   },
//   meta: {
//     invalidates: [
//       [queryKeyPrefixes.organizations, "roles"],
//       [queryKeyPrefixes.organizations, "roles", "single"],
//     ],
//   },
// });

// type TDeleteRoleInput = NonNullable<
//   Parameters<typeof authClient.organization.deleteRole>[0]
// >;
// export const deleteRoleMutationOptions = mutationOptions({
//   mutationFn: async (payload: TDeleteRoleInput) => {
//     const { data, error } = await authClient.organization.deleteRole(payload);
//     if (error) throw error;
//     return data;
//   },
//   meta: {
//     invalidates: [[queryKeyPrefixes.organizations, "roles"]],
//   },
// });

