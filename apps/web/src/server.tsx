import "./instrument.server";

import { wrapFetchWithSentry } from "@sentry/tanstackstart-react";
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

type MyRequestContext = {
  isServer: true;
};

declare module "@tanstack/react-start" {
  interface Register {
    server: {
      requestContext: MyRequestContext;
    };
  }
}

export default createServerEntry(
  wrapFetchWithSentry({
    async fetch(request) {
      return handler.fetch(request, { context: { isServer: true } });
    },
  }),
);
