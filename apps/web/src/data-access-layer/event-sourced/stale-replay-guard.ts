const staleReplayGuard = Symbol.for("agentic-json-resume.stale-replay-guard");

type ReplayMutation = {
  type: string;
  key: string | number;
  modified: unknown;
  original: unknown;
};

type ReplayTransaction = {
  mutations: ReplayMutation[];
};

type GuardedCollection = {
  get: (key: string | number) => unknown;
  utils: {
    acceptMutations: (transaction: ReplayTransaction) => unknown;
  };
};

function readUpdatedAt(value: unknown): number | null {
  if (value == null || typeof value !== "object" || !("updatedAt" in value)) return null;
  const updatedAt = value.updatedAt;
  return typeof updatedAt === "number" && Number.isFinite(updatedAt) ? updatedAt : null;
}

/**
 * True when the local row is newer than the payload a replay is about to write.
 *
 * Deletes are never stale. The deleting device already removed the row from its
 * own copy, so every other device must remove it too or they never agree again.
 * The delete carries the deleter's last copy of the row, which can be older than
 * an edit from another device, so its `updatedAt` says nothing about intent.
 */
export function isStaleReplay(local: unknown, mutation: ReplayMutation): boolean {
  if (mutation.type === "delete") return false;
  const localUpdatedAt = readUpdatedAt(local);
  if (localUpdatedAt == null) return false;
  const incoming = readUpdatedAt(mutation.modified);
  if (incoming == null) return false;
  return localUpdatedAt > incoming;
}

// A collection sync can replay into: it can load the current row and accept a pulled mutation.
function isGuardedCollection(value: unknown): value is GuardedCollection {
  if (value == null || typeof value !== "object") return false;
  if (!("get" in value) || typeof value.get !== "function") return false;
  if (!("utils" in value) || value.utils == null || typeof value.utils !== "object") return false;
  return "acceptMutations" in value.utils && typeof value.utils.acceptMutations === "function";
}

/**
 * Replaces each collection's `acceptMutations` with a wrapper that drops a pulled
 * write when the row already on this device is newer.
 *
 * Sync does not edit a résumé by calling `collection.update`. After a pull, the
 * library replays the event by calling `collection.utils.acceptMutations` with the
 * whole row from the other device. That function is the only door those replays
 * use, so this wrapper stands in front of it once, when the database is created.
 *
 * Device A has `{ id: "clone-1", name: "Clone with edits", updatedAt: 3000 }`.
 * Device B later pushes `{ id: "clone-1", name: "Older device save", updatedAt: 2000 }`.
 * A's next sync tries to replay that row. The wrapper loads the local row, sees
 * `3000 > 2000`, and drops the mutation, so the name stays `"Clone with edits"`.
 * An incoming row with `updatedAt: 4000` is passed through and the local row changes.
 *
 * A normal insert or edit in the app goes through `onInsert` and `onUpdate`.
 * Only a replay of a pulled event goes through `acceptMutations`.
 */
export function installStaleReplayGuard(db: { collections: object }): void {
  for (const collection of Object.values(db.collections)) {
    if (!isGuardedCollection(collection)) continue;
    const acceptMutations = collection.utils.acceptMutations;
    if (staleReplayGuard in acceptMutations) continue;

    const guarded = (transaction: ReplayTransaction) => {
      const fresh = transaction.mutations.filter(
        (mutation) => !isStaleReplay(collection.get(mutation.key), mutation),
      );
      if (fresh.length === 0) return;
      if (fresh.length === transaction.mutations.length) return acceptMutations(transaction);
      return acceptMutations({ ...transaction, mutations: fresh });
    };
    Object.defineProperty(guarded, staleReplayGuard, { value: true });
    collection.utils.acceptMutations = guarded;
  }
}
