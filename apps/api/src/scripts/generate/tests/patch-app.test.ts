import { describe, expect, it } from "vitest";
import { parseResourceName } from "../names";
import { patchAppSource } from "../patch-app";

const fixture = `import { createAppContainer } from "@api/core/di/create-app-container";
import { HealthController } from "@api/modules/health/health.controller";
import { MeController } from "@api/modules/me/me.controller";

export function createApp() {
  const container = createAppContainer({ db, auth });
  const health = container.resolve({ token: HealthController });
  const me = container.resolve({ token: MeController });

  return new Hono()
    .on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw))
    .route("/health", health.routes)
    .route("/me", me.routes)
    .route("/sync", syncRoute);
}
`;

describe("patchAppSource", () => {
  it("inserts import, resolve, and an explicit .route after existing modules", () => {
    const names = parseResourceName({ raw: "notes" });
    const next = patchAppSource({ source: fixture, names });
    expect(next).toContain(
      'import { NotesController } from "@api/modules/notes/notes.controller";',
    );
    expect(next).toContain("const notes = container.resolve({ token: NotesController });");
    expect(next).toContain('.route("/notes", notes.routes)');
    expect(next.indexOf('.route("/notes", notes.routes)')).toBeGreaterThan(
      next.indexOf('.route("/me", me.routes)'),
    );
    expect(next.indexOf('.route("/notes", notes.routes)')).toBeLessThan(
      next.indexOf('.route("/sync", syncRoute)'),
    );
  });

  it("refuses to mount a module twice", () => {
    const names = parseResourceName({ raw: "health" });
    expect(() => patchAppSource({ source: fixture, names })).toThrow(/already imported/);
  });
});
