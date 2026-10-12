import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import type { LayoutEntityKey } from "@/features/resume/resume-layout";
import type { TRouteID } from "@/lib/tanstack/router/router-types";
import { inArray, useLiveQuery } from "@tanstack/react-db";
import { getRouteApi } from "@tanstack/react-router";
import { resumesJobIds, resumesLibraryIds } from "../-utils/resume-filter";

/**
 * The `resumeIds` search param of a list route: the picked résumés, plus what
 * the list needs to scope its live queries to them.
 */
export function useResumeFilter(routeID: TRouteID) {
  const db = useEventSourcedDb();
  const routeApi = getRouteApi(routeID);
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const resumeIds = ("resumeIds" in search ? search.resumeIds : undefined) ?? [];
  const active = resumeIds.length > 0;

  const { data, isLoading } = useLiveQuery(
    (query) =>
      query
        .from({ resume: db.collections.resume })
        .where(({ resume }) => inArray(resume.id, resumeIds)),
    [resumeIds.join(",")],
  );
  const resumes = data ?? [];

  function setResumeIds(next: ReadonlyArray<string>) {
    void navigate({
      search: (prev) => ({
        ...prev,
        resumeIds: next.length > 0 ? [...next] : undefined,
        page: undefined,
      }),
      replace: true,
    });
  }

  /** Picking puts the résumé first; picking it again removes it. */
  function toggle(resumeId: string) {
    setResumeIds(
      resumeIds.includes(resumeId)
        ? resumeIds.filter((id) => id !== resumeId)
        : [resumeId, ...resumeIds],
    );
  }

  /** Clears the keyword and the résumés in one navigation. */
  function clearAll() {
    void navigate({
      search: (prev) => ({ ...prev, q: undefined, resumeIds: undefined, page: undefined }),
      replace: true,
    });
  }

  return {
    resumeIds,
    active,
    /** Picked résumés that still exist, in no particular order. */
    resumes,
    isLoading,
    /** `undefined` while no résumé is picked, so the list stays unscoped. */
    libraryIds: (key: LayoutEntityKey) => (active ? resumesLibraryIds(resumes, key) : undefined),
    jobIds: resumesJobIds(resumes),
    setResumeIds,
    toggle,
    clearAll,
  };
}
