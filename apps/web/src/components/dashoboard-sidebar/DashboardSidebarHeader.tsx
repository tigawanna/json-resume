import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { AppConfig } from "@/utils/system";
import { Link } from "@tanstack/react-router";

export function DashboardSidebarHeader() {
  const { setOpenMobile, open } = useSidebar();

  return (
    <div className="flex flex-col gap-3">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" asChild onClick={() => setOpenMobile(false)}>
            <Link
              to="/"
              className="hover:text-primary/5 cursor-pointer rounded-sm flex justify-center items-center"
            >
              <AppConfig.icon className={cn("text-primary size-40", open ? "size-40" : "size-8")} />
              {/* {state === "expanded" || isMobile ? (
                <span className="font-serif text-xl tracking-tight">
                  {AppConfig.wordmark}
                  <span className="text-primary">.</span>
                </span>
              ) : null} */}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  );
}
