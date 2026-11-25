import { timingSafeEqual } from "node:crypto";
import type { UserWithRole } from "./utils.js";

const epoch = new Date(0);

/** Synthetic admin attached when the x-admin header matches the env secret. */
export const DEV_ADMIN_USER: UserWithRole = {
  id: "dev-admin-bypass",
  name: "Dev admin",
  email: "dev-admin@localhost",
  emailVerified: true,
  createdAt: epoch,
  updatedAt: epoch,
  role: "admin",
  banned: false,
  image: undefined,
  banReason: undefined,
  banExpires: undefined,
};

/** True when a non-empty secret is configured and the header matches it. */
export function matchesAdminBypassHeader({
  header,
  secret,
}: {
  header: string | undefined;
  secret: string | undefined;
}) {
  const offered = header?.trim();
  if (!secret || !offered) return false;
  const expected = Buffer.from(secret);
  const actual = Buffer.from(offered);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
