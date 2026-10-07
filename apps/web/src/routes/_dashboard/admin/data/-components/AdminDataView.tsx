import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { AdminPageHeader } from "../../-components/AdminPageHeader";
import type { AdminDataSearch } from "../-utils/admin-data-search";
import { DataActionsSheet } from "./DataActionsSheet";
import { EventCollectionsTab } from "./EventCollectionsTab";
import { EventsTab } from "./EventsTab";
import { EventUsersTab } from "./EventUsersTab";

function isTab(value: string): value is AdminDataSearch["tab"] {
  return value === "events" || value === "collections" || value === "users";
}

export function AdminDataView({ search }: { search: AdminDataSearch }) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  function setSearch(next: Partial<AdminDataSearch>) {
    void navigate({ to: "/admin/data", search: { ...search, ...next } });
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6" data-test="admin-data">
      <AdminPageHeader
        title="Data management"
        description="What the server event log is doing, and tools to repair it."
        backTo="/admin"
        actions={
          <div className="flex items-center gap-2">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => void qc.invalidateQueries({ queryKey: ["admin"] })}
              data-test="admin-data-refresh"
            >
              <RefreshCw className="size-4" />
              Refresh
            </button>
            <DataActionsSheet />
          </div>
        }
      />

      <Tabs
        value={search.tab}
        onValueChange={(value) => {
          if (isTab(value)) setSearch({ tab: value });
        }}
      >
        <TabsList data-test="admin-data-tabs">
          <TabsTrigger value="events" data-test="admin-data-tab-events">
            Events
          </TabsTrigger>
          <TabsTrigger value="collections" data-test="admin-data-tab-collections">
            By collection
          </TabsTrigger>
          <TabsTrigger value="users" data-test="admin-data-tab-users">
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="mt-4">
          <EventsTab search={search} setSearch={setSearch} />
        </TabsContent>
        <TabsContent value="collections" className="mt-4">
          <EventCollectionsTab search={search} setSearch={setSearch} />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <EventUsersTab onSelect={(userId) => setSearch({ tab: "events", userId, page: 0 })} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
