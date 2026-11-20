import type { AuthSession } from "@api/auth/auth";
import { ViewerService } from "@api/modules/viewer/viewer.service";
import { describe, expect, it } from "vitest";

describe("ViewerService", () => {
  it("returns the user and session from the auth session", () => {
    const session = {
      user: { id: "u1", email: "a@b.c" },
      session: { id: "s1" },
    } as AuthSession;
    expect(new ViewerService().toViewer({ session })).toEqual({
      user: session.user,
      session: session.session,
    });
  });
});
