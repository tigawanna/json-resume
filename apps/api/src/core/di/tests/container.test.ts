import { getDb } from "@api/db/client";
import { Container } from "@api/core/di/container";
import { DbService } from "@api/core/db/db.service";
import { describe, expect, it } from "vitest";

class ProbeService {
  static readonly inject = { db: DbService };
  constructor({ db }: { db: DbService }) {
    this.db = db;
  }
  readonly db: DbService;
}

describe("Container", () => {
  it("injects the bound DbService into a service", () => {
    const container = new Container();
    const fake = new DbService({ db: getDb() });
    container.bind({ token: DbService, factory: () => fake });

    const probe = container.resolve({ token: ProbeService });
    expect(probe.db).toBe(fake);
    expect(container.resolve({ token: ProbeService })).toBe(probe);
  });

  it("throws when a constructor token is not bound", () => {
    const container = new Container();
    expect(() => container.resolve({ token: DbService })).toThrow(/No provider for DbService/);
  });
});
