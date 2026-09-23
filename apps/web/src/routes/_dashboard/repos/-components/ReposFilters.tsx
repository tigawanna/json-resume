import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/use-debouncer";
import { getRouteApi } from "@tanstack/react-router";
import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { REPO_PAGE_ROUTEID } from "./constants";
import {
  LANGUAGE_SELECT_CUSTOM,
  LANGUAGE_SELECT_NONE,
  POPULAR_GITHUB_LANGUAGES,
  canonicalizePopularLanguage,
  repositoryLanguageControlValue,
  splitLanguageForUi,
} from "./popular-github-languages";
import {
  buildRepoSearchPreview,
  defaultRepoSearch,
  parseRepoSearchBar,
  type RepoSearchFilters,
} from "./repos-search-query";

const routeApi = getRouteApi(REPO_PAGE_ROUTEID);

function filtersEqual(a: RepoSearchFilters, b: RepoSearchFilters) {
  return (
    a.query === b.query &&
    a.language === b.language &&
    a.topic === b.topic &&
    a.minStars === b.minStars &&
    a.fork === b.fork &&
    a.archived === b.archived &&
    a.sort === b.sort &&
    a.order === b.order
  );
}

export function ReposFilters() {
  const filters = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  const [queryDraft, setQueryDraft] = useState(() => buildRepoSearchPreview(filters));
  const [languageOtherOpen, setLanguageOtherOpen] = useState(
    () => repositoryLanguageControlValue(filters.language) === LANGUAGE_SELECT_CUSTOM,
  );

  function commitFilters(next: RepoSearchFilters) {
    setQueryDraft(buildRepoSearchPreview(next));
    void navigate({ search: next, replace: true });
  }

  function patchFilters(patch: Partial<RepoSearchFilters>) {
    commitFilters({ ...filters, ...patch });
  }

  const { debouncedValue: debouncedQueryDraft } = useDebouncedValue(queryDraft, 300);

  useEffect(() => {
    const next = parseRepoSearchBar(debouncedQueryDraft, filters);
    if (filtersEqual(next, filters)) return;
    void navigate({ search: next, replace: true });
    // Only re-parse when the typed query settles — not when controls patch the URL.
  }, [debouncedQueryDraft]);

  useEffect(() => {
    if (repositoryLanguageControlValue(filters.language) === LANGUAGE_SELECT_CUSTOM) {
      setLanguageOtherOpen(true);
    }
  }, [filters.language]);

  const langSplit = splitLanguageForUi(filters.language);
  const languageSelectValue =
    langSplit.preset === LANGUAGE_SELECT_CUSTOM ||
    (languageOtherOpen && langSplit.preset === LANGUAGE_SELECT_NONE)
      ? LANGUAGE_SELECT_CUSTOM
      : langSplit.preset;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center" data-test="repo-search-builder">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="repo-query"
          data-test="repo-query"
          placeholder="user:{you} portfolio in:name archived:false …"
          value={queryDraft}
          onChange={(event) => setQueryDraft(event.target.value)}
          className="pl-9 font-mono text-sm"
          spellCheck={false}
          aria-label="GitHub search query string"
        />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Select
          value={filters.sort}
          onValueChange={(value) => patchFilters({ sort: value as RepoSearchFilters["sort"] })}
        >
          <SelectTrigger data-test="repo-sort" className="h-9 w-42">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Recently updated</SelectItem>
            <SelectItem value="stars">Stars</SelectItem>
            <SelectItem value="forks">Fork count</SelectItem>
            <SelectItem value="help-wanted-issues">Help wanted</SelectItem>
            <SelectItem value="best-match">Best match</SelectItem>
          </SelectContent>
        </Select>

        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="icon" aria-label="Search filters">
              <SlidersHorizontal className="size-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[min(85vh,36rem)] max-w-xl gap-6 overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Repository filters</DialogTitle>
              <DialogDescription>
                Structured GitHub qualifiers. Sort and order stay as API params, not query text.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="repo-language-preset">Language</Label>
                <Select
                  value={languageSelectValue}
                  onValueChange={(value) => {
                    if (value === LANGUAGE_SELECT_NONE) {
                      setLanguageOtherOpen(false);
                      patchFilters({ language: "" });
                      return;
                    }
                    if (value === LANGUAGE_SELECT_CUSTOM) {
                      setLanguageOtherOpen(true);
                      if (canonicalizePopularLanguage(filters.language.trim())) {
                        patchFilters({ language: "" });
                      }
                      return;
                    }
                    setLanguageOtherOpen(false);
                    patchFilters({ language: value });
                  }}
                >
                  <SelectTrigger id="repo-language-preset" data-test="repo-language" className="w-full">
                    <SelectValue placeholder="Filter by language" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(280px,50vh)]">
                    <SelectItem value={LANGUAGE_SELECT_NONE}>Any language</SelectItem>
                    {POPULAR_GITHUB_LANGUAGES.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang}
                      </SelectItem>
                    ))}
                    <SelectItem value={LANGUAGE_SELECT_CUSTOM}>Other (type manually)</SelectItem>
                  </SelectContent>
                </Select>
                {languageSelectValue === LANGUAGE_SELECT_CUSTOM ? (
                  <Input
                    id="repo-language-custom"
                    data-test="repo-language-custom"
                    placeholder="e.g. Solidity, Fortran, COBOL"
                    value={filters.language}
                    onChange={(event) => patchFilters({ language: event.target.value })}
                    className="font-mono text-sm"
                  />
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="repo-topic">Topic</Label>
                  <Input
                    id="repo-topic"
                    data-test="repo-topic"
                    placeholder="react"
                    value={filters.topic}
                    onChange={(event) => patchFilters({ topic: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repo-stars">Minimum stars</Label>
                  <Input
                    id="repo-stars"
                    data-test="repo-stars"
                    min={0}
                    inputMode="numeric"
                    type="number"
                    placeholder="0"
                    value={filters.minStars}
                    onChange={(event) => patchFilters({ minStars: event.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Forks</Label>
                  <Select
                    value={filters.fork}
                    onValueChange={(value) =>
                      patchFilters({ fork: value as RepoSearchFilters["fork"] })
                    }
                  >
                    <SelectTrigger data-test="repo-fork-filter" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="source">Sources only</SelectItem>
                      <SelectItem value="all">Include forks</SelectItem>
                      <SelectItem value="fork">Forks only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Archive state</Label>
                  <Select
                    value={filters.archived}
                    onValueChange={(value) =>
                      patchFilters({ archived: value as RepoSearchFilters["archived"] })
                    }
                  >
                    <SelectTrigger data-test="repo-archived-filter" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active only</SelectItem>
                      <SelectItem value="any">Any state</SelectItem>
                      <SelectItem value="archived">Archived only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Order</Label>
                  <Select
                    value={filters.order}
                    onValueChange={(value) =>
                      patchFilters({ order: value as RepoSearchFilters["order"] })
                    }
                  >
                    <SelectTrigger data-test="repo-order" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">High to low</SelectItem>
                      <SelectItem value="asc">Low to high</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                data-test="repo-reset-filters"
                onClick={() => {
                  setLanguageOtherOpen(false);
                  commitFilters(defaultRepoSearch);
                }}
              >
                <RotateCcw className="size-4" />
                Reset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
