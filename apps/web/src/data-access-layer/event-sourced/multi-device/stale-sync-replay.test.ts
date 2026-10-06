// @vitest-environment node
/**
 * Replays the sync failure where a newer local edit disappears after sync.
 * Two node databases share one in-memory backend, with the same echo setting
 * the app uses (`recordLocalEchoes: false`).
 *
 * A local row whose `updatedAt` is newer must survive replay of an older
 * upstream event. The guard lives on `acceptMutations`, which is where both
 * pull and a later inbox replay write the row.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSyncDevices } from "./sync-test-devices";

type ResumeRow = {
  id: string;
  name: string;
  updatedAt: number;
};

function resumeDevices() {
  return createSyncDevices({
    backendId: "stale-sync-test",
    collections: {
      resume: { getKey: (row: ResumeRow) => row.id },
    },
  });
}

type Devices = ReturnType<typeof resumeDevices>;
type DeviceDb = Awaited<ReturnType<ReturnType<Devices["open"]>["ensureDb"]>>;

let devices: Devices;

function resume(db: DeviceDb, id: string): ResumeRow {
  const row = db.collections.resume.get(id);
  if (!row) throw new Error(`resume ${id} is missing`);
  return row;
}

beforeEach(() => {
  devices = resumeDevices();
});

afterEach(() => devices.close());

describe("stale sync replay", () => {
  it("keeps a local clone when the other device syncs before that clone is uploaded", async () => {
    const deviceA = devices.open("device-a");
    const deviceB = devices.open("device-b");
    const dbA = await deviceA.ensureDb();
    const dbB = await deviceB.ensureDb();

    await dbA.collections.resume.insert({ id: "original", name: "Original", updatedAt: 1_000 })
      .isPersisted.promise;
    await dbA.sync();

    await dbA.collections.resume.insert({ id: "clone", name: "Clone", updatedAt: 2_000 })
      .isPersisted.promise;
    await dbA.collections.resume.update("clone", (draft) => {
      draft.name = "Clone with edits";
      draft.updatedAt = 3_000;
    }).isPersisted.promise;

    await dbB.sync();
    expect(dbB.collections.resume.get("clone")).toBeUndefined();

    await dbA.sync();

    expect(resume(dbA, "clone")).toMatchObject({
      name: "Clone with edits",
      updatedAt: 3_000,
    });
  });

  it("does not let an older remote write replace a newer local edit on pull", async () => {
    const deviceA = devices.open("device-a");
    const deviceB = devices.open("device-b");
    const dbA = await deviceA.ensureDb();
    const dbB = await deviceB.ensureDb();

    await dbA.collections.resume.insert({ id: "resume-1", name: "Draft", updatedAt: 1_000 })
      .isPersisted.promise;
    await dbA.sync();
    await dbB.sync();
    expect(resume(dbB, "resume-1").name).toBe("Draft");

    await dbA.collections.resume.update("resume-1", (draft) => {
      draft.name = "Fresh edit";
      draft.updatedAt = 3_000;
    }).isPersisted.promise;

    await dbB.collections.resume.update("resume-1", (draft) => {
      draft.name = "Older device save";
      draft.updatedAt = 2_000;
    }).isPersisted.promise;
    await dbB.sync();

    const result = await dbA.sync();

    expect(result.errors).toEqual([]);
    expect(resume(dbA, "resume-1")).toMatchObject({
      name: "Fresh edit",
      updatedAt: 3_000,
    });
  });
});
