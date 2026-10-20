import { useEffect } from "react";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { pacerDevtoolsPlugin } from "@tanstack/react-pacer-devtools";
import { aiDevtoolsPlugin } from "@tanstack/react-ai-devtools";
import { startAiDevtoolsClientLog } from "./ai-devtools-client-log";

export function TanstackDevtools() {
  useEffect(() => {
    startAiDevtoolsClientLog();
  }, []);

  return (
    <TanStackDevtools
      config={{
        position: "middle-right",
      }}
      eventBusConfig={{
        connectToServerBus: true,
      }}
      plugins={[
        {
          name: "Tanstack Router",
          render: <TanStackRouterDevtoolsPanel />,
        },
        {
          name: "Tanstack Query",
          render: <ReactQueryDevtoolsPanel />,
        },
        pacerDevtoolsPlugin(),
        aiDevtoolsPlugin(),
      ]}
    />
  );
}
