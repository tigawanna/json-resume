import { ListPageHeader } from "@/components/wrappers/ListPageHeader";
import { apiKeysQueryOptions } from "@/data-access-layer/api-keys/api-keys-query-options";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ApiKeysSection } from "./-components/ApiKeysSection";

export const Route = createFileRoute("/_dashboard/settings/")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings", description: "Manage your account and API keys" },
    ],
  }),
});

function SettingsPage() {
  const { data } = useSuspenseQuery(apiKeysQueryOptions);

  return (
    <div className="flex flex-col gap-8" data-test="settings-page">
      <ListPageHeader title="Settings" />
      <ApiKeysSection apiKeys={data.apiKeys} />
    </div>
  );
}
