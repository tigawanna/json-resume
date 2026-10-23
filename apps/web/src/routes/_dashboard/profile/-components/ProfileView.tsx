import { Button } from "@/components/ui/button";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { formatDistanceToNow } from "date-fns";
import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Calendar,
  ChevronLeft,
  Clock,
  Globe,
  LogOut,
  Mail,
  Monitor,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function ProfileView() {
  const { viewer, logoutMutation } = useViewer();
  const user = viewer.user;

  if (!user) {
    return (
      <div className="bg-base-100 mx-auto w-full max-w-md rounded-2xl border px-6 py-10 text-center shadow-sm">
        <p className="text-sm font-medium">Not signed in</p>
        <p className="text-muted-foreground mt-1 text-sm">Sign in to see this account.</p>
        <Button asChild className="mt-4">
          <Link to="/auth" search={{ returnTo: "/profile" }}>
            Sign in
          </Link>
        </Button>
      </div>
    );
  }

  const plan = user.role === "admin" ? "Admin" : "Free";

  return (
    <div
      className="bg-base-100 mx-auto flex w-full max-w-md shrink-0 flex-col rounded-2xl border shadow-sm"
      data-test="profile-page"
    >
      <header className="relative flex min-h-14 items-center border-b px-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/settings" aria-label="Back to settings">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="pointer-events-none absolute inset-x-0 text-center text-sm font-semibold">
          Account
        </h1>
      </header>

      <div className="flex flex-col gap-6 px-5 py-8">
        <div className="flex flex-col items-center text-center">
          {user.image ? (
            <img src={user.image} alt="" className="size-20 rounded-full object-cover" />
          ) : (
            <div
              aria-hidden
              className="bg-primary/10 text-primary flex size-20 items-center justify-center rounded-full text-2xl font-semibold"
            >
              {(user.name || user.email || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <p className="mt-3 text-base font-semibold">{user.name || "—"}</p>
          <p className="text-muted-foreground text-sm">{user.email}</p>
        </div>

        <ProfileGroup title="Account">
          <ProfileRow icon={Sparkles} label="Plan" value={plan} />
          <ProfileRow
            icon={user.emailVerified ? BadgeCheck : Mail}
            label="Email"
            value={user.emailVerified ? "Verified" : "Not verified"}
          />
          <ProfileRow icon={Calendar} label="Joined" value={formatWhen(user.createdAt)} />
        </ProfileGroup>

        <ProfileGroup title="This session">
          <ProfileRow
            icon={Globe}
            label="Browser"
            value={browserLabel(viewer.session?.userAgent)}
          />
          <ProfileRow
            icon={Monitor}
            label="Started"
            value={formatWhen(viewer.session?.createdAt)}
          />
          <ProfileRow icon={Clock} label="Expires" value={formatWhen(viewer.session?.expiresAt)} />
        </ProfileGroup>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={logoutMutation.isPending}
          onClick={() => logoutMutation.mutate()}
        >
          <LogOut className="mr-2 size-4" />
          {logoutMutation.isPending ? "Signing out..." : "Log out"}
        </Button>
      </div>
    </div>
  );
}

function ProfileGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-muted-foreground px-1 text-xs font-medium">{title}</h2>
      <div className="divide-y overflow-hidden rounded-xl border">{children}</div>
    </section>
  );
}

function ProfileRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />
      <span className="text-sm">{label}</span>
      <span className="text-muted-foreground ml-auto truncate text-sm">{value}</span>
    </div>
  );
}

function formatWhen(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return formatDistanceToNow(date, { addSuffix: true });
}

function browserLabel(userAgent: string | null | undefined) {
  if (!userAgent) return "—";
  if (userAgent.includes("Edg/")) return "Edge";
  if (userAgent.includes("Chrome/")) return "Chrome";
  if (userAgent.includes("Firefox/")) return "Firefox";
  if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/")) return "Safari";
  return "This browser";
}
