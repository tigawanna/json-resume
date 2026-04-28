import { SidebarItem } from "@/components/sidebar/types";
import {
  Award,
  Briefcase,
  Contact,
  FileText,
  FolderGit2,
  FolderKanban,
  Github,
  Globe,
  GraduationCap,
  Heart,
  LayoutDashboard,
  Link,
  Mic,
  Settings,
  StickyNote,
  Wrench,
} from "lucide-react";

export const dashboard_account_routes = [
  { title: "Settings", href: "/settings", icon: Settings },
] satisfies SidebarItem[];

export const dashboard_admin_routes = [] satisfies SidebarItem[];

export function getDashboardPrimaryRoutes(): SidebarItem[] {
  return [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { title: "Resumes", href: "/resumes", icon: FileText },
    {
      title: "Resume Data",
      href: "/experiences",
      icon: Briefcase,
      sublinks: [
        { title: "Experiences", href: "/experiences", icon: Briefcase },
        { title: "Education", href: "/education", icon: GraduationCap },
        { title: "Projects", href: "/resume-projects", icon: FolderKanban },
        { title: "Skills", href: "/skill-groups", icon: Wrench },
        { title: "Certifications", href: "/certifications", icon: Award },
        { title: "Talks", href: "/talks", icon: Mic },
        { title: "Volunteers", href: "/volunteers", icon: Heart },
        { title: "Languages", href: "/languages", icon: Globe },
        { title: "Contacts", href: "/contacts", icon: Contact },
        { title: "Links", href: "/links", icon: Link },
        { title: "Summaries", href: "/summaries", icon: StickyNote },
      ],
    },
    { title: "Repositories", href: "/repos", icon: Github },
    { title: "Saved Projects", href: "/saved-projects", icon: FolderGit2 },
  ];
}

export const dashboard_routes = [
  ...getDashboardPrimaryRoutes(),
  ...dashboard_account_routes,
  ...dashboard_admin_routes,
] satisfies SidebarItem[];
