import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { AiAccessService } from "./ai-access.service.js";

async function createAccessService({ allowAnonymous }: { allowAnonymous: boolean }) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      AiAccessService,
      {
        provide: ConfigService,
        useValue: {
          get: (key: string) =>
            key === "HOSTED_AI_ALLOW_ANONYMOUS" && allowAnonymous ? "true" : undefined,
        },
      },
    ],
  }).compile();
  return moduleRef.get(AiAccessService);
}

const member = { id: "user-1", banned: null };
const banned = { id: "user-2", banned: true };

describe("AI access", () => {
  it("uses the authenticated user id", async () => {
    const access = await createAccessService({ allowAnonymous: false });
    expect(access.resolveUserId({ current: member })).toBe("user-1");
  });

  it("allows local anonymous orchestration only when configured", async () => {
    const allowed = await createAccessService({ allowAnonymous: true });
    const denied = await createAccessService({ allowAnonymous: false });
    expect(allowed.resolveUserId({})).toBe("local");
    expect(denied.resolveUserId({})).toBeNull();
  });

  it("never lets a banned account fall back to anonymous", async () => {
    const access = await createAccessService({ allowAnonymous: true });
    expect(access.resolveUserId({ current: banned })).toBeNull();
  });
});
