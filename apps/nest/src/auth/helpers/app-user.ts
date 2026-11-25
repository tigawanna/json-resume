export type AppUser = {
  id: string;
  email: string;
  name: string;
  role: string | null;
  banned: boolean;
};

export function hasRole({ role, required }: { role: string | null; required: string[] }) {
  const held = (role ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return required.some((value) => held.includes(value));
}
