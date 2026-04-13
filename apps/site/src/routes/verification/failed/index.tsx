import { createFileRoute } from "@tanstack/react-router";
import { AppConfig } from "@/utils/system";
import { VerificationFailedScreen } from "./-components/VerificationFailedScreen";

export const Route = createFileRoute("/verification/failed/")({
  component: VerificationFailedPage,
  head: () => ({
    meta: [
      {
        title: `${AppConfig.name} | Verification failed`,
        description: "Identity verification could not be completed",
      },
    ],
  }),
});

function VerificationFailedPage() {
  return <VerificationFailedScreen />;
}
