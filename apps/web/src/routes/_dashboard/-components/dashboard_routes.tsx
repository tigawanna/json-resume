import { SidebarItem } from "@/components/sidebar/types";
import {
  Award,
  Briefcase,
  Contact,
  FileText,
  FolderKanban,
  Github,
  Globe,
  GraduationCap,
  Heart,
  Inbox,
  LayoutDashboard,
  Link,
  Mail,
  MessageSquareText,
  Mic,
  Notebook,
  Settings,
  Shield,
  UserRound,
  StickyNote,
  Wrench,
} from "lucide-react";

export const dashboard_account_routes = [
  { title: "Account", href: "/profile", icon: UserRound },
  { title: "Settings", href: "/settings", icon: Settings },
] satisfies SidebarItem[];

export const dashboard_admin_routes = [
  { title: "Admin", href: "/admin", icon: Shield },
] satisfies SidebarItem[];

export function getDashboardPrimaryRoutes(): SidebarItem[] {
  return [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { title: "Resumes", href: "/resumes", icon: FileText },
    { title: "Public résumés", href: "/public-resumes", icon: Globe },
    { title: "Jobs", href: "/jobs", icon: Briefcase },
    { title: "Cover letters", href: "/cover-letters", icon: Mail },
    { title: "Application answers", href: "/application-answers", icon: MessageSquareText },
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
        { title: "Notes", href: "/notes", icon: Notebook },
      ],
    },
    { title: "Repositories", href: "/repos", icon: Github },
    { title: "Events", href: "/events", icon: Inbox },
  ];
}

export const dashboard_routes = [
  ...getDashboardPrimaryRoutes(),
  ...dashboard_account_routes,
] satisfies SidebarItem[];
