import { Skeleton } from "@/components/ui/skeleton";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { AppConfig } from "@/utils/system";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function DashboardSidebarHeader() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" asChild onClick={() => setOpenMobile(false)}>
            <Link to="/" className="hover:bg-base-300 cursor-pointer rounded-sm">
              {(() => {
                const Icon = AppConfig.icon;
                return <Icon className="text-primary size-5" />;
              })()}
              {state === "expanded" || isMobile ? (
                <span className="font-serif text-xl tracking-tight">
                  {AppConfig.name.toLowerCase()}
                  <span className="text-primary">.</span>
                </span>
              ) : null}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  );
}
