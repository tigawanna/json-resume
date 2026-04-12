import { useViewer } from "@/data-access-layer/auth/viewer";
import { MutationButton } from "@/lib/tanstack/query/MutationButton";

export function LogoutButton() {
  const { logoutMutation } = useViewer();
  return (
    <MutationButton
      onClick={() => logoutMutation.mutate()}
      className="btn-error"
      label="Logout"
      mutation={logoutMutation}
    />
  );
}
