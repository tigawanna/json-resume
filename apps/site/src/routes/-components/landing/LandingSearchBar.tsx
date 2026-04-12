import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { MapPin, Search } from "lucide-react";

export function LandingSearchBar() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate({
      to: "/search",
      search: { q: trimmed },
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleSearch();
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="flex max-w-md flex-1 items-center gap-2 rounded-lg border border-base-100/20 bg-base-100/10 px-4 py-3 backdrop-blur-md dark:border-base-content/20 dark:bg-base-content/10">
        <MapPin className="size-5 shrink-0 text-primary" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search…"
          className="w-full bg-transparent text-sm text-base-100 outline-none placeholder:text-base-100/50 dark:text-base-content dark:placeholder:text-base-content/50"
        />
      </div>
      <Button
        size="lg"
        onClick={handleSearch}
        className="gap-2 rounded-lg px-8 text-base shadow-lg shadow-primary/30"
      >
        <Search className="size-4" />
        Search
      </Button>
    </div>
  );
}
