import { LegalDocumentLayout } from "@/components/legal/LegalDocumentLayout";
import { privacyPolicy } from "@/data/legal/privacy";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy/")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: `Privacy Policy · ${AppConfig.name}` },
      {
        name: "description",
        content: `Privacy policy for ${AppConfig.name}. Your résumé library stays local until you sync or send a prompt.`,
      },
    ],
  }),
});

function PrivacyPage() {
  return (
    <LegalDocumentLayout
      title={privacyPolicy.title}
      lastUpdated={privacyPolicy.lastUpdated}
      intro={privacyPolicy.intro}
      sections={privacyPolicy.sections}
      currentPath="/privacy"
    />
  );
}
