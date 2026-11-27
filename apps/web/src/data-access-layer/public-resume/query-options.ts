import {
  publicResumeControllerGetById,
  publicResumeControllerGetMine,
  publicResumeControllerList,
} from "@/services/nest/client";
import { queryOptions } from "@tanstack/react-query";

export const publicResumeKeys = {
  all: ["public-resume"] as const,
  byId: (id: string) => [...publicResumeKeys.all, "by-id", id] as const,
  mine: (sourceResumeId: string) => [...publicResumeKeys.all, "mine", sourceResumeId] as const,
  list: (opts?: { keyword?: string; page?: number }) =>
    [...publicResumeKeys.all, "list", opts?.keyword ?? "", opts?.page ?? 1] as const,
};

export const publicResumeQueryOptions = (id: string) =>
  queryOptions({
    queryKey: publicResumeKeys.byId(id),
    queryFn: () => publicResumeControllerGetById({ path: { id } }),
  });

export const myPublicResumeQueryOptions = (sourceResumeId: string) =>
  queryOptions({
    queryKey: publicResumeKeys.mine(sourceResumeId),
    queryFn: () => publicResumeControllerGetMine({ query: { sourceResumeId } }),
  });

export const myPublicResumesListQueryOptions = (opts: {
  keyword?: string;
  page?: number;
  limit: number;
}) => {
  const page = opts.page && opts.page > 0 ? opts.page : 1;
  const offset = (page - 1) * opts.limit;
  return queryOptions({
    queryKey: publicResumeKeys.list({ keyword: opts.keyword, page }),
    queryFn: () =>
      publicResumeControllerList({
        query: { keyword: opts.keyword, limit: opts.limit, offset },
      }),
  });
};
