import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { MutationButton } from "@/lib/tanstack/query/MutationButton";
import { Link, useLocation } from "@tanstack/react-router";
import { CreditCard, Keyboard, Mail, Settings, User, UserCircle } from "lucide-react";

interface CurrentUserProps {}

export function CurrentUser(_props: CurrentUserProps) {
  const location = useLocation();
  const { viewer, logoutMutation } = useViewer();

  if (!viewer) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <UserCircle className="size-6" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72 border-none p-3">
          <DropdownMenuLabel>Login</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <Link
                className="flex items-center gap-2"
                search={{ returnTo: location.pathname }}
                to="/auth"
              >
                <User className="mr-2 size-4" />
                <span>Login</span>
                <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  const avatarUrl = viewer.user?.image ?? "/blank-user.png";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar>
          <AvatarImage src={avatarUrl} alt={viewer.user?.name} />
          <AvatarFallback>{viewer.user?.name.slice(0, 2)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72 border-none p-3">
        {/* <DropdownMenuLabel>My Account</DropdownMenuLabel> */}
        <DropdownMenuSeparator />
        <div className="flex h-full w-full gap-3">
          <Avatar>
            <AvatarImage src={avatarUrl} alt={viewer.user?.name} />
            <AvatarFallback>{viewer.user?.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex h-full w-full flex-col p-1">
            <div className="i flex h-full w-full items-center gap-1">
              <Mail className="size-3" />
              <span className="text-xs">{viewer.user?.email}</span>
            </div>
            <span className="text-xs">{viewer.user?.name}</span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem>
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Billing</span>
            <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Keyboard className="mr-2 h-4 w-4" />
            <span>Keyboard shortcuts</span>
            <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <div className="flex h-full w-full items-center justify-center gap-3">
          <MutationButton
            className="btn-error"
            onClick={() => logoutMutation.mutate()}
            label="Logout"
            mutation={logoutMutation}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
