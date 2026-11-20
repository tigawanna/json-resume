import { requireSession } from "@api/auth/middleware";
import { ViewerService } from "@api/modules/viewer/viewer.service";
import type { AppEnv } from "@api/types";
import { Hono } from "hono";

function createViewerRoutes({ viewer }: { viewer: ViewerService }) {
  return new Hono<AppEnv>().get("/", requireSession, (c) => {
    return c.json(viewer.toViewer({ session: c.get("session") }));
  });
}

export class ViewerController {
  static readonly inject = { viewer: ViewerService };

  constructor({ viewer }: { viewer: ViewerService }) {
    this.routes = createViewerRoutes({ viewer });
  }

  readonly routes: ReturnType<typeof createViewerRoutes>;
}
