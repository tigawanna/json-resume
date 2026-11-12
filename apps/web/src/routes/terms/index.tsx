import { LegalDocumentLayout } from "@/components/legal/LegalDocumentLayout";
import { termsOfService } from "@/data/legal/terms";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms/")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: `Terms of Service · ${AppConfig.name}` },
      {
        name: "description",
        content: `Terms of service for ${AppConfig.name}, including ATS-friendly PDF export.`,
      },
    ],
  }),
});

function TermsPage() {
  return (
    <LegalDocumentLayout
      title={termsOfService.title}
      lastUpdated={termsOfService.lastUpdated}
      intro={termsOfService.intro}
      sections={termsOfService.sections}
      currentPath="/terms"
    />
  );
}
