import { SidebarItem } from "@/components/sidebar/types";
import { FileText, FolderGit2, LayoutDashboard, Settings, Shield } from "lucide-react";

export const dashboard_account_routes = [
  { title: "Settings", href: "/settings", icon: Settings },
] satisfies SidebarItem[];

export const dashboard_admin_routes = [
  { title: "Admin", href: "/admin", icon: Shield },
] satisfies SidebarItem[];

export function getDashboardPrimaryRoutes(): SidebarItem[] {
  return [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { title: "Resumes", href: "/resumes", icon: FileText },
    { title: "Repositories", href: "/repos", icon: FolderGit2 },
  ];
}

export const dashboard_routes = [
  ...getDashboardPrimaryRoutes(),
  ...dashboard_account_routes,
  ...dashboard_admin_routes,
] satisfies SidebarItem[];
