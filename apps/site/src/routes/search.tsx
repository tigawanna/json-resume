import { Footer } from "@/components/navigation/Footer";
import { ResponsiveGenericToolbar } from "@/components/navigation/ResponsiveGenericToolbar";
import { AppConfig } from "@/utils/system";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";
import { z } from "zod";

const searchParams = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute("/search")({
  validateSearch: (search) => searchParams.parse(search),
  component: SearchPage,
  head: () => ({
    meta: [
      {
        title: `${AppConfig.name} | Search`,
        description: "Search across the app.",
      },
    ],
  }),
});

function SearchPage() {
  const { q } = useSearch({ from: "/search" });

  return (
    <div className="bg-base-100 flex min-h-screen w-full flex-col">
      <ResponsiveGenericToolbar>
        <div className="min-h-screen flex flex-1 flex-col items-center justify-center gap-6 py-20">
          <SearchIcon className="size-16 text-primary/30" />
          <h1 className="text-center font-serif text-4xl text-base-content md:text-5xl">
            {q ? (
              <>
                Results for <span className="italic text-primary">"{q}"</span>
              </>
            ) : (
              "Search"
            )}
          </h1>
          <p className="max-w-md text-center text-base-content/60">
            This page is a placeholder. Wire it to your search backend or Algolia when you are
            ready.
          </p>
        </div>
        <Footer />
      </ResponsiveGenericToolbar>
    </div>
  );
}
