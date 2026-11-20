import {
  adminUserCreditsQueryOptions,
  adminUserWalletQueryOptions,
} from "@/data-access-layer/credits/credits-query-options";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AdminUserCreditsView } from "./-components/AdminUserCreditsView";

const userCreditsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
});

export const Route = createFileRoute("/_dashboard/admin/users/$userId/")({
  validateSearch: userCreditsSearchSchema,
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(adminUserWalletQueryOptions({ userId: params.userId })),
      context.queryClient.ensureQueryData(
        adminUserCreditsQueryOptions({ userId: params.userId, page: 1, perPage: 20 }),
      ),
    ]),
  component: AdminUserCreditsView,
  head: () => ({ meta: [{ title: "Admin · User credits" }] }),
});
