import { educationCollection } from "@/data-access-layer/resume/education/education.collection";
import { deleteEducationMutationOptions } from "@/data-access-layer/resume/education/education.mutation-options";
import { ilike, or, useLiveSuspenseQuery } from "@tanstack/react-db";
import { useMutation } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";
import { Route } from "..";
import { EducationListCard } from "./EducationListCard";

export function EducationList() {
  const { sq } = Route.useSearch();

  const { data: items } = useLiveSuspenseQuery(
    (q) => {
      let query = q.from({ education: educationCollection });
      if (sq) {
        const pattern = `%${sq}%`;
        query = query.where(({ education }) =>
          or(
            ilike(education.school, pattern),
            ilike(education.degree, pattern),
            ilike(education.field, pattern),
            ilike(education.description, pattern),
          ),
        );
      }
      return query;
    },
    [sq],
  );

  const deleteMutation = useMutation(deleteEducationMutationOptions);

  return (
    <div className="flex w-full h-full flex-col gap-6" data-test="education-list-page">
      <div className="flex-1" data-test="education-list">
        {items.length === 0 ? (
          <div className="flex flex-col h-full items-center justify-center gap-4 py-16">
            <GraduationCap className="text-muted-foreground size-12" />
            <p className="text-muted-foreground text-sm">
              No education entries found. Add education to your resumes first.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <EducationListCard
                key={item.id}
                education={item}
                onDelete={(id) => {
                  educationCollection.utils.writeDelete(id);
                  deleteMutation.mutate(id);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
