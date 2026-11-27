import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  enabled: false,
  desktop: false,
  post: vi.fn(),
}));

vi.mock("@/lib/env/client-env", () => ({
  get clientEnv() {
    return {
      VITE_CREDITS_ENABLED: mocks.enabled ? "true" : undefined,
      VITE_DESKTOP: mocks.desktop ? "true" : undefined,
    };
  },
}));

vi.mock("@/services/nest/client", () => ({
  get creditsControllerCheck() {
    return mocks.post;
  },
}));

import {
  ensureResumeCredit,
  requireResumeCredit,
  InsufficientCreditsClientError,
  OUT_OF_CREDITS_EVENT,
} from "./resume-credit-guard";

function okResponse(available: number) {
  return {
    available,
    monthly: available,
    bonus: 0,
    resetsAt: "2026-12-01T00:00:00.000Z",
  };
}

beforeEach(() => {
  mocks.enabled = false;
  mocks.desktop = false;
  mocks.post.mockReset();
  vi.unstubAllGlobals();
});

describe("ensureResumeCredit", () => {
  it("allows the write when credits are disabled or the build is desktop", async () => {
    expect(await ensureResumeCredit({ action: "create" })).toEqual({ ok: true });
    expect(mocks.post).not.toHaveBeenCalled();

    mocks.enabled = true;
    mocks.desktop = true;
    expect(await ensureResumeCredit({ action: "create" })).toEqual({ ok: true });
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("allows the write when credits are available", async () => {
    mocks.enabled = true;
    mocks.post.mockResolvedValue(okResponse(1));

    expect(await ensureResumeCredit({ action: "clone" })).toEqual({ ok: true });
    expect(mocks.post).toHaveBeenCalledWith({ body: { action: "clone" } });
  });

  it("blocks and notifies at zero credits", async () => {
    mocks.enabled = true;
    mocks.post.mockResolvedValue(okResponse(0));
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dispatchEvent });

    const result = await ensureResumeCredit({ action: "create" });

    expect(result).toMatchObject({
      ok: false,
      reason: "insufficient",
      available: 0,
      resetsAt: "2026-12-01T00:00:00.000Z",
    });
    expect(dispatchEvent).toHaveBeenCalledOnce();
    expect(dispatchEvent.mock.calls[0]?.[0]).toMatchObject({ type: OUT_OF_CREDITS_EVENT });
  });

  it("can block without opening the dialog (AI tools)", async () => {
    mocks.enabled = true;
    mocks.post.mockResolvedValue(okResponse(0));
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dispatchEvent });

    expect(await ensureResumeCredit({ action: "tailor", notify: false })).toMatchObject({
      ok: false,
      reason: "insufficient",
    });
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it("fails open when offline or when the check RPC fails", async () => {
    mocks.enabled = true;
    vi.stubGlobal("navigator", { onLine: false });
    expect(await ensureResumeCredit({ action: "import" })).toEqual({ ok: true });
    expect(mocks.post).not.toHaveBeenCalled();

    vi.stubGlobal("navigator", { onLine: true });
    mocks.post.mockRejectedValue(new Error("network down"));
    expect(await ensureResumeCredit({ action: "import" })).toEqual({ ok: true });
  });
});

describe("requireResumeCredit", () => {
  it("throws a typed denial before any local insert at zero credits", async () => {
    mocks.enabled = true;
    mocks.post.mockResolvedValue(okResponse(0));

    await expect(requireResumeCredit({ action: "create", notify: false })).rejects.toBeInstanceOf(
      InsufficientCreditsClientError,
    );
  });

  it("does not throw when credits are available", async () => {
    mocks.enabled = true;
    mocks.post.mockResolvedValue(okResponse(1));

    await expect(requireResumeCredit({ action: "create" })).resolves.toBeUndefined();
  });
});
