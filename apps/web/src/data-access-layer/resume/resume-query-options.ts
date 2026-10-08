import { queryOptions } from "@tanstack/react-query";
import { getResume, listResumes } from "./resume.functions";

export const resumeListQueryOptions = queryOptions({
  queryKey: ["resumes"],
  queryFn: () => listResumes(),
});

export function resumeDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: ["resumes", id],
    queryFn: () => getResume({ data: { id } }),
  });
}
