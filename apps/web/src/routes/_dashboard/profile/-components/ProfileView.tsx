import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { formatDistanceToNow } from "date-fns";
import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Calendar,
  Clock,
  Globe,
  LogOut,
  Mail,
  Monitor,
  Settings,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function ProfileView() {
  const { viewer, logoutMutation } = useViewer();
  const user = viewer.user;

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6" data-test="profile-page">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Account</h1>
          <p className="text-muted-foreground text-sm">Your profile, plan, and active session.</p>
        </header>

        <section className="rounded-xl bg-base-100 px-6 py-12 text-center ring-1 ring-base-content/10">
          <span
            aria-hidden
            className="bg-primary/10 text-primary mx-auto grid size-12 place-items-center rounded-full"
          >
            <Mail className="size-5" />
          </span>
          <p className="mt-4 text-base font-semibold">Not signed in</p>
          <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
            Sign in to see your account details, manage your plan, and sync across devices.
          </p>
          <Button asChild className="mt-5">
            <Link to="/auth" search={{ returnTo: "/profile" }}>
              Sign in
            </Link>
          </Button>
        </section>
      </div>
    );
  }

  const plan = user.role === "admin" ? "Admin" : "Free";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6" data-test="profile-page">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Account</h1>
          <p className="text-muted-foreground text-sm">Your profile, plan, and active session.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit shrink-0"
          disabled={logoutMutation.isPending}
          onClick={() => logoutMutation.mutate()}
        >
          <LogOut className="size-4" />
          {logoutMutation.isPending ? "Signing out…" : "Log out"}
        </Button>
      </header>

      <section className="overflow-hidden rounded-xl bg-base-100 ring-1 ring-base-content/10">
        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center">
          {user.image ? (
            <img
              src={user.image}
              alt=""
              className="size-16 shrink-0 rounded-full object-cover ring-2 ring-base-content/10"
            />
          ) : (
            <div
              aria-hidden
              className="bg-primary/10 text-primary flex size-16 shrink-0 items-center justify-center rounded-full text-xl font-semibold ring-2 ring-base-content/10"
            >
              {(user.name || user.email || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold">{user.name || "—"}</h2>
              <Badge variant={user.role === "admin" ? "default" : "secondary"}>{plan}</Badge>
              {user.emailVerified ? (
                <Badge variant="outline" className="gap-1">
                  <BadgeCheck className="size-3" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline">Unverified</Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-0.5 truncate text-sm">{user.email}</p>
          </div>
          <Button asChild variant="outline" size="sm" className="w-fit shrink-0">
            <Link to="/settings">
              <Settings className="size-4" />
              Settings
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <ProfileGroup icon={Sparkles} title="Account details">
          <ProfileRow icon={Sparkles} label="Plan" value={plan} />
          <ProfileRow
            icon={user.emailVerified ? BadgeCheck : Mail}
            label="Email"
            value={user.emailVerified ? "Verified" : "Not verified"}
          />
          <ProfileRow icon={Calendar} label="Joined" value={formatWhen(user.createdAt)} />
        </ProfileGroup>

        <ProfileGroup icon={Monitor} title="Current session">
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
      </div>
    </div>
  );
}

function ProfileGroup({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl bg-base-100 ring-1 ring-base-content/10">
      <header className="relative flex items-center gap-2 px-5 py-3.5 before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-base-content/10">
        <Icon className="text-muted-foreground size-4" aria-hidden />
        <h2 className="text-sm font-semibold">{title}</h2>
      </header>
      <div className="flex flex-col">{children}</div>
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
    <div className="relative flex items-center gap-3 px-5 py-3 before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-base-content/10 first:before:hidden">
      <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="ml-auto truncate text-sm font-medium">{value}</span>
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
