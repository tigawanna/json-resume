import { SidebarMenu, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { AppConfig } from "@/utils/system";
import { Link } from "@tanstack/react-router";

export function DashboardSidebarHeader() {
  const { setOpenMobile, open } = useSidebar();

  return (
    <div className="flex flex-col gap-3">
      <SidebarMenu className="">
        <SidebarMenuItem className="">
          <Link
            to="/"
            onClick={() => setOpenMobile(false)}
            className="hover:text-primary/5 cursor-pointer rounded-sm flex justify-center items-center"
          >
            <AppConfig.icon className={cn("text-primary", open ? "h-20 w-full" : "size-8")} />
          </Link>
          {/* <SidebarMenuButton
            className="w-full h-full"
            size="lg"
            asChild
            onClick={() => setOpenMobile(false)}>
            <Link
              to="/"
              className="hover:text-primary/5 cursor-pointer rounded-sm flex justify-center items-center">
              <AppConfig.icon className={cn("text-primary", open ? "size-140" : "size-80")} />
            </Link>
          </SidebarMenuButton> */}
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  );
}
