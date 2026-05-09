import { viewerqueryOptions, type TViewer } from "@/data-access-layer/auth/viewer";
import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { evlogErrorHandler } from "evlog/nitro/v3";

import appCss from "../styles.css?url";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TanstackDevtools } from "@/lib/tanstack/devtools/devtools";
import { ThemeProvider } from "@/lib/tanstack/router/theme-provider";
import { AppConfig } from "@/utils/system";
import type { QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { clientEnv } from "@/lib/client-env";
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
  server: {
    middleware: [createMiddleware().server(evlogErrorHandler)],
  },
  beforeLoad: async ({ context }) => {
    const viewer = await context.queryClient.ensureQueryData(viewerqueryOptions);
    return { viewer: viewer.data };
  },
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
        keywords:
          "resume, JSON resume, PDF, job application, LLM, tailored resume, TanStack Start, React",
        og: {
          title: AppConfig.name,
          description: AppConfig.description,
          image: clientEnv.VITE_API_URL + "/og.png",
          url: clientEnv.VITE_API_URL,
          type: "website",
        },
        twitter: {
          card: "summary_large_image",
          image: clientEnv.VITE_API_URL + "/og.png",
        },
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        type: "image/png",
        href: "/favicon-96x96.png",
        sizes: "96x96",
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
      {
        rel: "shortcut icon",
        href: "/favicon.ico",
      },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "manifest",
        href: "/site.webmanifest",
      },
    ],
  }),
  validateSearch: (search) => searchparams.parse(search),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-style="angled" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider defaultTheme="system" storageKey={AppConfig.themeStorageKey}>
          <TooltipProvider>
            {children}
            {import.meta.env.DEV ? <TanstackDevtools /> : null}
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
