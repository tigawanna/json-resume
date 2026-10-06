import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import {
  deviceSessionsQueryOptions,
  setActiveSessionMutationOptions,
} from "@/data-access-layer/auth/device-sessions";
import { useViewer, viewerqueryOptions } from "@/data-access-layer/auth/viewer";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronsUpDown, LogOut, RefreshCwOff, Settings, Sparkles, UserPlus } from "lucide-react";
import { toast } from "sonner";

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

export function DashboardSidebarUser() {
  const qc = useQueryClient();
  const router = useRouter();
  const tsrNavigate = useNavigate();
  const location = useLocation();
  const { isMobile, state } = useSidebar();
  const isExpanded = state === "expanded" || isMobile;
  const { viewer, logoutMutation } = useViewer();
  const { data: sessions = [] } = useQuery(deviceSessionsQueryOptions);
  const setActiveMutation = useMutation(setActiveSessionMutationOptions);

  const otherSessions = viewer?.session
    ? sessions.filter((s) => s.session.id !== viewer.session?.id)
    : [];

  const handleSelectSession = (sessionToken: string) => {
    setActiveMutation.mutate(sessionToken, {
      onSuccess: async () => {
        toast.success("Account switched");
        await qc.invalidateQueries({ queryKey: ["viewer"] });
        await qc.invalidateQueries({
          queryKey: deviceSessionsQueryOptions.queryKey,
        });
        await router.invalidate();
        await qc.fetchQuery(viewerqueryOptions);
        void tsrNavigate({ to: location.pathname });
      },
      onError: (error: unknown) => {
        toast.error("Failed to switch account", {
          description: unwrapUnknownError(error).message,
        });
      },
    });
  };

  if (!viewer.user) {
    const returnTo = location.pathname || "/dashboard";

    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <HoverCard openDelay={150} closeDelay={120}>
            <HoverCardTrigger asChild>
              <SidebarMenuButton
                size="lg"
                asChild
                className="group-data-[collapsible=icon]:justify-center"
              >
                <Link to="/auth" search={{ returnTo }} data-test="dashboard-sidebar-signin">
                  <RefreshCwOff className="size-4 shrink-0" aria-hidden />
                  {isExpanded ? (
                    <span className="truncate font-medium">Sign in</span>
                  ) : (
                    <span className="sr-only">Sign in</span>
                  )}
                </Link>
              </SidebarMenuButton>
            </HoverCardTrigger>
            <HoverCardContent
              side={isMobile ? "top" : "right"}
              align="end"
              sideOffset={8}
              className="w-72"
              data-test="dashboard-sidebar-signin-hover"
            >
              <div className="flex gap-3">
                <RefreshCwOff
                  className="text-muted-foreground mt-0.5 size-4 shrink-0"
                  aria-hidden
                />
                <div className="grid gap-3">
                  <p className="text-sm text-pretty">
                    You are not signed in. Everything you do stays on this computer until you enable
                    sync.
                  </p>
                  <div className="flex flex-col gap-1.5 text-sm">
                    <Link
                      to="/auth"
                      search={{ returnTo }}
                      className="text-primary font-medium underline-offset-4 hover:underline"
                    >
                      Sign in to sync
                    </Link>
                    <Link
                      to="/auth/signup"
                      search={{ returnTo }}
                      className="text-muted-foreground font-medium underline-offset-4 hover:underline hover:text-foreground"
                    >
                      Create an account to sync
                    </Link>
                  </div>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const avatarUrl = viewer.user?.image ?? "/blank-user.png";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-6 shrink-0 rounded-lg">
                <AvatarImage src={avatarUrl} alt={viewer.user?.name} />
                <AvatarFallback className="rounded-lg">
                  {viewer.user?.name?.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              {isExpanded ? (
                <>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{viewer.user?.name}</span>
                    <span className="truncate text-xs">{viewer.user?.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </>
              ) : null}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatarUrl} alt={viewer.user?.name} />
                  <AvatarFallback className="rounded-lg">
                    {viewer.user?.name?.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="flex items-center gap-1 truncate font-medium">
                    {viewer.user?.name}
                  </span>
                  <span className="truncate text-xs">{viewer.user?.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                Switch account
              </DropdownMenuLabel>
              {otherSessions.map(({ session, user }) => (
                <DropdownMenuItem
                  key={session.id}
                  disabled={setActiveMutation.isPending}
                  onClick={() => handleSelectSession(session.token)}
                  className="gap-3 py-2"
                >
                  <Avatar className="size-7 rounded-md">
                    {user.image && <AvatarImage src={user.image} alt={user.name} />}
                    <AvatarFallback className="rounded-md text-xs">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                  </div>
                  {setActiveMutation.isPending && setActiveMutation.variables === session.token && (
                    <Spinner className="size-4" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onClick={() =>
                  tsrNavigate({
                    to: "/auth",
                    search: {
                      returnTo: location.pathname || "/dashboard",
                      useAnotherAccount: true,
                    },
                  })
                }
              >
                <UserPlus className="size-4" />
                Use another account
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Sparkles />
                Upgrade to Pro
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <Link to="/settings" className="w-full">
                <DropdownMenuItem>
                  <Settings />
                  Settings
                </DropdownMenuItem>
              </Link>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logoutMutation.mutate();
                void tsrNavigate({ to: "/dashboard" });
              }}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
