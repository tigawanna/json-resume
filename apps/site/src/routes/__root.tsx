import type { TViewer } from "@/data-access-layer/auth/viewer";
import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";

import appCss from "../styles.css?url";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TanstackDevtools } from "@/lib/tanstack/devtools/devtools";
import { ThemeProvider } from "@/lib/tanstack/router/theme-provider";
import { AppConfig } from "@/utils/system";
import type { QueryClient } from "@tanstack/react-query";
import { z } from "zod";

interface MyRouterContext {
  queryClient: QueryClient;
  viewer?: TViewer;
  testValue?: string;
}

const searchparams = z.object({
  globalPage: z.number().optional(),
  globalSearch: z.string().optional(),
});

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: AppConfig.name,
        description: AppConfig.description,
        keywords: "react, tanstack start, tanstack router, vite, typescript, monorepo, vite+",
        og: {
          title: AppConfig.name,
          description: AppConfig.description,
          image: "https://example.com/og.png",
          url: "https://example.com",
          type: "website",
        },
        twitter: {
          card: "summary_large_image",
          image: "https://example.com/og.png",
        },
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  validateSearch: (search) => searchparams.parse(search),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider defaultTheme="system" storageKey={AppConfig.themeStorageKey}>
          <TooltipProvider>
            {children}
            <TanstackDevtools />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
