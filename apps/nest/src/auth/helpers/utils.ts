import type { Auth } from '../better-auth/create-auth.js';

/** Signed-in caller attached to the request by AppAuthGuard. */
export type UserWithRole = Awaited<ReturnType<Auth['api']['getUser']>>;

/** True when the comma-separated Better Auth role string includes any required role. */
export function hasRole({
  role,
  required,
}: {
  role: string | null | undefined;
  required: string[];
}) {
  const held = (role ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return required.some((value) => held.includes(value));
}
