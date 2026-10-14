// @vitest-environment node
/**
 * Library compaction planned on devices and only appended by the server.
 * Several node databases share one in-memory log; the mock backend applies the
 * server's accept-or-stale rule (`acceptCompactionOn`).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { emptyResumeLayout, type ResumeLayout } from "@/features/resume/resume-layout";
import {
  COMPACTION_COLLECTION,
  COMPACTION_REQUEST_COLLECTION,
  compactionRequestEvent,
} from "@/modules/sync/plan/compaction-protocol";
import type { Resume, ResumeExperience, ResumeExperienceBullet, ResumeSkill } from "../../schemas";
import { createSyncDevices } from "./sync-test-devices";

let clock = 100_000;

function libraryDevices() {
  return createSyncDevices({
    backendId: "compaction-test",
    now: () => clock,
    collections: {
      resume: { getKey: (row: Resume) => row.id },
      resumeExperience: { getKey: (row: ResumeExperience) => row.id },
      resumeExperienceBullet: { getKey: (row: ResumeExperienceBullet) => row.id },
      resumeSkill: { getKey: (row: ResumeSkill) => row.id },
    },
  });
}

type Devices = ReturnType<typeof libraryDevices>;
type Device = ReturnType<Devices["open"]>;
type DeviceDb = Awaited<ReturnType<Device["ensureDb"]>>;

let devices: Devices;

const stamps = (at: number) => ({ createdAt: at, updatedAt: at });
const embeddable = { searchableText: "", embedding: null, embeddingModel: null };

function skill(id: string, name: string, at: number): ResumeSkill {
  return { id, userId: "u", name, level: null, sortOrder: 0, ...embeddable, ...stamps(at) };
}

function experience(id: string, company: string, at: number): ResumeExperience {
  return {
    id,
    company,
    role: "Engineer",
    startDate: "2020",
    endDate: "",
    location: "",
    sortOrder: 0,
    userId: "u",
    ...embeddable,
    ...stamps(at),
  };
}

function bullet(
  id: string,
  experienceId: string,
  text: string,
  at: number,
): ResumeExperienceBullet {
  return { id, experienceId, text, sortOrder: 0, ...embeddable, ...stamps(at) };
}

function resume(id: string, layout: Partial<ResumeLayout>, at: number): Resume {
  return {
    id,
    userId: "u",
    name: id,
    fullName: "",
    headline: "",
    description: "",
    templateId: "classic",
    layout: { ...emptyResumeLayout(), ...layout },
    ...embeddable,
    ...stamps(at),
  };
}

function skillsOn(db: DeviceDb, resumeId: string): string[] {
  const layout = db.collections.resume.get(resumeId)?.layout;
  return layout?.skillGroups.flatMap((group) => group.skills) ?? [];
}

function skillNames(db: DeviceDb): string[] {
  return db.collections.resumeSkill.toArray.map((row) => row.name).sort();
}

function markers(collectionId = COMPACTION_COLLECTION) {
  return devices.backend.events.filter((event) => event.collectionId === collectionId);
}

function deletesOf(key: string) {
  return devices.backend.events.filter((event) => event.type === "delete" && event.key === key);
}

async function syncAndCompact(device: Device, db: DeviceDb) {
  return device.compaction.afterSync(db, await db.sync());
}

async function open(clientId: string) {
  const device = devices.open(clientId);
  return { device, db: await device.ensureDb() };
}

function requestCompaction(prune: boolean) {
  const event = compactionRequestEvent(prune);
  devices.backend.seed({ ...event, clientId: "admin" });
}

beforeEach(() => {
  clock = 100_000;
  devices = libraryDevices();
});

afterEach(() => devices.close());

describe("device-planned compaction", () => {
  it("lets the device that pushed a duplicate merge it, and every other device replays the result", async () => {
    const a = await open("device-a");
    const b = await open("device-b");

    await a.db.collections.resumeSkill.insert(skill("s1", "React", 1_000)).isPersisted.promise;
    await a.db.collections.resume.insert(
      resume("r1", { skillGroups: [{ id: "g1", skills: ["s1"] }] }, 1_000),
    ).isPersisted.promise;
    await syncAndCompact(a.device, a.db);
    await b.db.sync();

    await b.db.collections.resumeSkill.insert(skill("s2", "react ", 2_000)).isPersisted.promise;
    await b.db.collections.resume.insert(
      resume("r2", { skillGroups: [{ id: "g1", skills: ["s2"] }] }, 2_000),
    ).isPersisted.promise;

    expect(await syncAndCompact(b.device, b.db)).toMatchObject({ status: "accepted" });
    expect(await syncAndCompact(a.device, a.db)).toEqual({ status: "stood-down" });

    for (const db of [a.db, b.db]) {
      expect(skillNames(db)).toEqual(["react "]);
      expect(skillsOn(db, "r1")).toEqual(["s2"]);
      expect(skillsOn(db, "r2")).toEqual(["s2"]);
    }
    expect(markers()).toHaveLength(1);
  });

  it("drops a plan made against an older log and replays the one that won instead", async () => {
    const a = await open("device-a");
    const b = await open("device-b");

    await a.db.collections.resumeSkill.insert(skill("s1", "React", 1_000)).isPersisted.promise;
    await a.db.collections.resumeSkill.insert(skill("s2", "react", 1_000)).isPersisted.promise;
    await a.db.sync();
    await b.db.collections.resumeSkill.insert(skill("s3", "REACT", 1_000)).isPersisted.promise;
    const bSynced = await b.db.sync();

    clock += 1;
    await a.db.collections.resumeSkill.insert(skill("s4", "Vue", 1_000)).isPersisted.promise;
    expect(await syncAndCompact(a.device, a.db)).toMatchObject({ status: "accepted" });

    expect(await b.device.compaction.afterSync(b.db, bSynced)).toEqual({ status: "stale" });
    expect(skillNames(b.db)).toEqual(["REACT", "React", "react"]);
    expect(markers()).toHaveLength(1);

    expect(await syncAndCompact(b.device, b.db)).toEqual({ status: "stood-down" });
    await syncAndCompact(a.device, a.db);
    for (const db of [a.db, b.db]) expect(skillNames(db)).toEqual(["React", "Vue"]);
    expect(markers()).toHaveLength(1);
  });

  it("answers an admin request on the first device to pull it, pruning when asked", async () => {
    const a = await open("device-a");
    const b = await open("device-b");

    await a.db.collections.resumeSkill.insert(skill("used", "Go", 1_000)).isPersisted.promise;
    await a.db.collections.resumeSkill.insert(skill("unused", "Rust", 1_000)).isPersisted.promise;
    await a.db.collections.resume.insert(
      resume("r1", { skillGroups: [{ id: "g1", skills: ["used"] }] }, 1_000),
    ).isPersisted.promise;
    await a.db.sync();
    await b.db.sync();

    requestCompaction(true);
    expect(await syncAndCompact(b.device, b.db)).toMatchObject({ status: "accepted" });
    expect(await syncAndCompact(a.device, a.db)).toEqual({ status: "stood-down" });

    for (const db of [a.db, b.db]) expect(skillNames(db)).toEqual(["Go"]);
    expect(markers(COMPACTION_REQUEST_COLLECTION)).toHaveLength(1);
    expect(markers()).toHaveLength(1);

    expect(await syncAndCompact(a.device, a.db)).toEqual({ status: "idle" });
  });
});

describe("a device that diverged while offline", () => {
  it("keeps a pruned row its own résumé started using, sends it back, and is not pruned again", async () => {
    const a = await open("device-a");
    const b = await open("device-b");

    await a.db.collections.resumeSkill.insert(skill("go", "Go", 1_000)).isPersisted.promise;
    await a.db.collections.resumeSkill.insert(skill("rust", "Rust", 1_000)).isPersisted.promise;
    await a.db.collections.resume.insert(
      resume("r1", { skillGroups: [{ id: "g1", skills: ["go"] }] }, 1_000),
    ).isPersisted.promise;
    await a.db.sync();
    await b.db.sync();

    // B goes offline and puts Rust on the résumé; A prunes Rust meanwhile.
    await b.db.collections.resume.update("r1", (draft) => {
      draft.layout = {
        ...emptyResumeLayout(),
        skillGroups: [{ id: "g1", skills: ["go", "rust"] }],
      };
      draft.updatedAt = 5_000;
    }).isPersisted.promise;
    requestCompaction(true);
    expect(await syncAndCompact(a.device, a.db)).toMatchObject({ status: "accepted" });
    expect(skillNames(a.db)).toEqual(["Go"]);

    expect(await syncAndCompact(b.device, b.db)).toEqual({ status: "resent", rows: 1 });
    await syncAndCompact(a.device, a.db);
    const fresh = await open("device-fresh");
    await fresh.db.sync();

    for (const db of [a.db, b.db, fresh.db]) {
      expect(skillNames(db)).toEqual(["Go", "Rust"]);
      expect(skillsOn(db, "r1")).toEqual(["go", "rust"]);
    }

    requestCompaction(true);
    for (let round = 0; round < 3; round++) {
      await syncAndCompact(a.device, a.db);
      await syncAndCompact(b.device, b.db);
    }
    expect(deletesOf("rust")).toHaveLength(1);
    expect(skillNames(a.db)).toEqual(["Go", "Rust"]);
  });

  it("keeps an edit made to a merged-away row and lets the next merge settle on it", async () => {
    const a = await open("device-a");
    const b = await open("device-b");

    await a.db.collections.resumeSkill.insert(skill("s1", "React", 2_000)).isPersisted.promise;
    await a.db.collections.resumeSkill.insert(skill("s2", "react", 1_000)).isPersisted.promise;
    await a.db.collections.resume.insert(
      resume("r1", { skillGroups: [{ id: "g1", skills: ["s2"] }] }, 1_000),
    ).isPersisted.promise;
    await a.db.sync();
    await b.db.sync();

    // B, offline, levels up the row A is about to merge away.
    await b.db.collections.resumeSkill.update("s2", (draft) => {
      draft.level = "expert";
      draft.updatedAt = 3_000;
    }).isPersisted.promise;
    clock = 2_500;
    requestCompaction(false);
    expect(await syncAndCompact(a.device, a.db)).toMatchObject({ status: "accepted" });
    expect(skillNames(a.db)).toEqual(["React"]);

    clock = 10_000;
    expect(await syncAndCompact(b.device, b.db)).toEqual({ status: "resent", rows: 1 });
    expect(await syncAndCompact(b.device, b.db)).toMatchObject({ status: "accepted" });
    for (let round = 0; round < 3; round++) {
      await syncAndCompact(a.device, a.db);
      await syncAndCompact(b.device, b.db);
    }

    for (const db of [a.db, b.db]) {
      const rows = db.collections.resumeSkill.toArray;
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ id: "s2", level: "expert" });
      expect(skillsOn(db, "r1")).toEqual(["s2"]);
    }
    expect(markers()).toHaveLength(2);
  });

  it("keeps an experience whose new bullet the compaction never saw", async () => {
    const a = await open("device-a");
    const b = await open("device-b");

    await a.db.collections.resumeExperience.insert(experience("e1", "Acme", 1_000)).isPersisted
      .promise;
    await a.db.sync();
    await b.db.sync();

    await b.db.collections.resumeExperienceBullet.insert(bullet("b1", "e1", "Shipped it", 4_000))
      .isPersisted.promise;
    requestCompaction(true);
    await syncAndCompact(a.device, a.db);
    expect(a.db.collections.resumeExperience.get("e1")).toBeUndefined();

    expect(await syncAndCompact(b.device, b.db)).toEqual({ status: "resent", rows: 1 });
    await syncAndCompact(a.device, a.db);
    for (const db of [a.db, b.db]) {
      expect(db.collections.resumeExperience.get("e1")).toBeDefined();
      expect(db.collections.resumeExperienceBullet.get("b1")).toBeDefined();
    }
  });

  it("still applies an ordinary delete even when a résumé here uses the row", async () => {
    const a = await open("device-a");
    const b = await open("device-b");

    await a.db.collections.resumeSkill.insert(skill("go", "Go", 1_000)).isPersisted.promise;
    await a.db.sync();
    await b.db.sync();

    await b.db.collections.resume.insert(
      resume("r1", { skillGroups: [{ id: "g1", skills: ["go"] }] }, 2_000),
    ).isPersisted.promise;
    await a.db.collections.resumeSkill.delete("go").isPersisted.promise;
    await a.db.sync();

    expect(await syncAndCompact(b.device, b.db)).not.toMatchObject({ status: "resent" });
    expect(b.db.collections.resumeSkill.get("go")).toBeUndefined();
  });
});
