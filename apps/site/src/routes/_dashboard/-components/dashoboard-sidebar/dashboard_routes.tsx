import { SidebarItem } from "@/components/sidebar/types";
import { Building2, Heart, Settings, Shield, ShoppingBag, Star, User } from "lucide-react";

export const dashboard_account_routes = [
  { title: "Settings", href: "/settings", icon: Settings },
] satisfies SidebarItem[];

export const dashboard_admin_routes = [
  { title: "Admin", href: "/admin", icon: Shield },
] satisfies SidebarItem[];

export function getDashboardPrimaryRoutes(hasOrganizations: boolean): SidebarItem[] {
  const start: SidebarItem[] = hasOrganizations
    ? [{ title: "Organizations", href: "/dashboard", icon: Building2 }]
    : [{ title: "Profile", href: "/profile", icon: User }];

  return [
    ...start,
    { title: "Orders", href: "/orders", icon: ShoppingBag },
    { title: "Favorites", href: "/favorites", icon: Heart },
    { title: "Reviews", href: "/reviews", icon: Star },
  ];
}

export const dashboard_routes = [
  ...getDashboardPrimaryRoutes(false),
  ...dashboard_account_routes,
  ...dashboard_admin_routes,
] satisfies SidebarItem[];
