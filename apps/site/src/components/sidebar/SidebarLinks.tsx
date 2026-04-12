import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { SidebarItem } from "./types";

interface SidebarLinksProps {
  links: SidebarItem[];
  isNested?: boolean;
}

export function SidebarLinks({ links, isNested = false }: SidebarLinksProps) {
  const { state } = useSidebar();
  const showTooltips = state === "collapsed";

  if (links.length === 0) {
    return null;
  }

  const Container = isNested ? SidebarMenuSub : SidebarMenu;

  return (
    <Container>
      {links.map((item) => {
        // Early return for items with sublinks
        if (item.sublinks && item.sublinks.length > 0) {
          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                {showTooltips ? (
                  <TooltipProvider>
                    <Tooltip delayDuration={200}>
                      <CollapsibleTrigger asChild>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton>
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </TooltipTrigger>
                      </CollapsibleTrigger>
                      <TooltipContent side="right">{item.title}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                )}
                <CollapsibleContent>
                  <SidebarLinks links={item.sublinks} isNested={true} />
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        }

        // Default return for flat items
        return (
          <SidebarMenuItem key={item.title}>
            {showTooltips ? (
              <TooltipProvider>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton asChild>
                      <Link to={item.href}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.title}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <SidebarMenuButton asChild>
                <Link to={item.href}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        );
      })}
    </Container>
  );
}
