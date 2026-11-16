import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AdminWaitlistList } from "./-components/AdminWaitlistList";

const waitlistSearchSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  status: z.enum(["joined", "removed"]).optional(),
  hasAccount: z.enum(["true", "false"]).optional(),
});

export const Route = createFileRoute("/_dashboard/admin/waitlist/")({
  validateSearch: waitlistSearchSchema,
  component: AdminWaitlistPage,
});

function AdminWaitlistPage() {
  return <AdminWaitlistList />;
}
