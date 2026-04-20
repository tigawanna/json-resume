import { certificationsCollection } from "@/data-access-layer/resume/certifications/certification.collection";
import { deleteCertificationMutationOptions } from "@/data-access-layer/resume/certifications/certification.mutation-options";
import { ilike, or, useLiveSuspenseQuery } from "@tanstack/react-db";
import { useMutation } from "@tanstack/react-query";
import { Award } from "lucide-react";
import { Route } from "..";
import { CertificationListCard } from "./CertificationListCard";

export function CertificationList() {
  const { sq } = Route.useSearch();
  const { data: items } = useLiveSuspenseQuery(
    (q) => {
      let query = q.from({ certification: certificationsCollection });
      if (sq) {
        const pattern = `%${sq}%`;
        query = query.where(({ certification }) =>
          or(ilike(certification.name, pattern), ilike(certification.issuer, pattern)),
        );
      }
      return query;
    },
    [sq],
  );
  const deleteMutation = useMutation(deleteCertificationMutationOptions);
  return (
    <div className="flex w-full h-full flex-col gap-6" data-test="certification-list-page">
      <div className="flex-1" data-test="certification-list">
        {items.length === 0 ? (
          <div className="flex flex-col h-full items-center justify-center gap-4 py-16">
            <Award className="text-muted-foreground size-12" />
            <p className="text-muted-foreground text-sm">
              No certifications found. Add certifications to your resumes first.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <CertificationListCard
                key={item.id}
                certification={item}
                onDelete={(id) => {
                  certificationsCollection.utils.writeDelete(id);
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
