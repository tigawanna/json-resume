import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import {
  deviceSessionsQueryOptions,
  setActiveSessionMutationOptions,
} from "@/data-access-layer/auth/device-sessions";
import { viewerqueryOptions } from "@/data-access-layer/auth/viewer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Route } from "../index";

interface SessionPickerProps {
  onUseAnotherAccount: () => void;
}

function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function SessionPicker({ onUseAnotherAccount }: SessionPickerProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const { returnTo } = Route.useSearch();
  const navigate = useNavigate();
  const { data: sessions = [] } = useQuery(deviceSessionsQueryOptions);
  const setActiveMutation = useMutation(setActiveSessionMutationOptions);

  const handleSelectSession = (sessionToken: string) => {
    setActiveMutation.mutate(sessionToken, {
      onSuccess: async () => {
        toast.success("Welcome back");
        await router.invalidate();
        await qc.fetchQuery(viewerqueryOptions);
        void navigate({ to: returnTo || "/dashboard" });
      },
      onError: (error) => {
        toast.error("Failed to switch session", {
          description: error.message,
        });
      },
    });
  };

  return (
    <div className="flex h-full w-full flex-1 items-center justify-center p-5">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <img src="/logo.svg" alt="demo" className="h-12 w-12 object-contain" />
          <h1 className="text-2xl font-bold">Choose an account</h1>
          <p className="text-muted-foreground text-sm">to continue to demo</p>
        </div>

        <div className="bg-card w-full overflow-hidden rounded-xl border shadow-sm">
          {sessions.map(({ session, user }) => (
            <button
              key={session.id}
              type="button"
              disabled={setActiveMutation.isPending}
              onClick={() => handleSelectSession(session.token)}
              className="hover:bg-accent flex w-full items-center gap-4 border-b px-4 py-3 transition-colors last:border-b-0 disabled:opacity-50"
            >
              <Avatar size="lg">
                {user.image && <AvatarImage src={user.image} alt={user.name} />}
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-medium">{user.name}</span>
                <span className="text-muted-foreground text-xs">{user.email}</span>
              </div>
              {setActiveMutation.isPending && setActiveMutation.variables === session.token && (
                <Spinner className="ml-auto" />
              )}
            </button>
          ))}

          <button
            type="button"
            onClick={onUseAnotherAccount}
            className="hover:bg-accent flex w-full items-center gap-4 px-4 py-3 transition-colors"
          >
            <div className="bg-muted flex size-10 items-center justify-center rounded-full">
              <UserPlus className="text-muted-foreground size-5" />
            </div>
            <span className="text-sm font-medium">Use another account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
