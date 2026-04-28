import { dashboard_routes } from "@/routes/_dashboard/-components/dashoboard-sidebar/dashboard_routes";
import { Home, Store } from "lucide-react";

export const routes = [
  {
    title: "Home",
    href: "/",
    icon: Home,
    sublinks: undefined,
  },
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Store,
    sublinks: dashboard_routes,
  },
] as const;
