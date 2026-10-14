/* After a sync, plans a library compaction proposal and applies the accepted outcome locally. */
import type { ServerEvent, SyncResult, SyncStatus, SyncTransport } from "event-sourced-collection";
import { layoutReferencedIds, resumeLayoutSchema } from "@/features/resume/resume-layout";
import { ownedChildren } from "@/modules/library/library-references";
import {
  COMPACTION_INPUT_COLLECTIONS,
  planCompaction,
  type CompactionOp,
} from "@/modules/sync/shared/compact-plan";
import {
  COMPACTION_CLIENT_ID,
  COMPACTION_COLLECTION,
  COMPACTION_REQUEST_COLLECTION,
  compactionMarkerSchema,
  compactionRequestSchema,
  MAX_PROPOSAL_BYTES,
  MAX_PROPOSAL_OPS,
  type CompactionOutcome,
  type CompactionProposal,
} from "@/modules/sync/shared/compaction-protocol";

type Row = Record<string, unknown>;

type ReplayMutation = {
  mutationId?: string;
  type: string;
  key: string | number;
  modified: unknown;
};

type ReplayTransaction = { mutations: ReplayMutation[] };

type RowCollection = {
  get: (key: string) => unknown;
  readonly toArray: unknown[];
  update: (
    key: string,
    callback: (draft: Row) => void,
  ) => { isPersisted: { promise: Promise<unknown> } };
  utils: { acceptMutations: (transaction: ReplayTransaction) => unknown };
};

export type CompactionDb = {
  collections: object;
  sync: () => Promise<SyncResult>;
  getSyncStatus: () => SyncStatus;
};

export type ProposeCompaction = (proposal: CompactionProposal) => Promise<CompactionOutcome>;

export type AfterSyncOutcome =
  | { status: "skipped" | "idle" | "stood-down" | "throttled" | "stale" | "too-large" }
  | { status: "resent"; rows: number }
  | { status: "accepted"; events: number };

const compactionGuard = Symbol.for("agentic-json-resume.compaction-guard");

const CHILD_COLLECTIONS = new Set(
  Object.values(ownedChildren).flatMap((children) => children.map((child) => child.collectionId)),
);

function isRecord(value: unknown): value is Row {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isRowCollection(value: unknown): value is RowCollection {
  if (!isRecord(value)) return false;
  if (typeof value.get !== "function" || typeof value.update !== "function") return false;
  if (!("toArray" in value) || !isRecord(value.utils)) return false;
  return typeof value.utils.acceptMutations === "function";
}

function readUpdatedAt(value: unknown): number {
  if (!isRecord(value)) return 0;
  return typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt)
    ? value.updatedAt
    : 0;
}

/** A collection row without TanStack's `$synced` / `$origin` / … virtual props. */
function plainRow(value: unknown): Row | null {
  if (!isRecord(value)) return null;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !key.startsWith("$")));
}

/** Deletes only need enough of the row to audit and restore it; embeddings dwarf the rest. */
function wireOp(op: CompactionOp): CompactionOp {
  if (op.type !== "delete" || !("embedding" in op.row)) return op;
  const row = { ...op.row };
  delete row.embedding;
  return { ...op, row };
}

/**
 * Library compaction run by the devices themselves; the server only appends
 * an accepted proposal (see `compaction-protocol.ts`).
 *
 * - `wrapTransport` watches pulls for compaction ops, accepted-compaction
 *   markers and admin requests.
 * - `install` guards replay: a compaction delete is held back when this device
 *   still needs the row (it is newer here, a résumé here still shows it, or a
 *   child here still points at it). The row goes back up as an ordinary
 *   update, so devices that applied the delete get it back. Ordinary deletes
 *   are never held back.
 * - `afterSync` runs after every successful sync. It sends held-back rows
 *   first, stands down for a round when another compaction just arrived, and
 *   otherwise plans one when this device pushed something, a request is open,
 *   or its last proposal was stale. The plan is proposed against the pull
 *   cursor and only applied here when it comes back on the next pull, so a
 *   stale plan is simply dropped.
 *
 * No loop: a compaction only deletes what it saw, rewrites always outrank the
 * row they read, and a held-back row comes back newer and still in use, so
 * the next plan keeps it.
 */
export function createSyncCompaction(options: {
  propose: ProposeCompaction;
  now?: () => number;
  newId?: () => string;
  /** Least time between two automatic proposals from this device. */
  minIntervalMs?: number;
}) {
  const now = options.now ?? Date.now;
  const newId = options.newId ?? (() => crypto.randomUUID());
  const minIntervalMs = options.minIntervalMs ?? 30_000;

  let collections: Record<string, RowCollection> = {};
  /** Event ids of compaction ops pulled in the current page, consumed by the replay guard. */
  const inboundOps = new Set<string>();
  /** Rows held back from a compaction delete, sent back up after the sync. */
  const heldBack = new Map<string, { collectionId: string; key: string }>();
  let compactionsSeen = 0;
  let request: { seq: number; prune: boolean } | null = null;
  /** Set after a stale proposal or a send-back, either of which can leave duplicates behind. */
  let planDue = false;
  let lastProposalAt = Number.NEGATIVE_INFINITY;
  let reachedCache: Set<string> | null = null;

  function observe(events: ReadonlyArray<ServerEvent>) {
    for (const event of events) {
      if (event.collectionId === COMPACTION_COLLECTION) {
        compactionsSeen += 1;
        const marker = compactionMarkerSchema.safeParse(event.payload);
        const covers = marker.success && (marker.data.prune || !request?.prune);
        if (request && event.globalSeq > request.seq && covers) request = null;
        continue;
      }
      if (event.collectionId === COMPACTION_REQUEST_COLLECTION) {
        const parsed = compactionRequestSchema.safeParse(event.payload);
        if (!parsed.success) continue;
        request = { seq: event.globalSeq, prune: parsed.data.prune || (request?.prune ?? false) };
        continue;
      }
      if (event.clientId === COMPACTION_CLIENT_ID) inboundOps.add(event.eventId);
    }
  }

  function reachedByLayouts(): Set<string> {
    if (reachedCache) return reachedCache;
    const reached = new Set<string>();
    for (const resume of collections.resume?.toArray ?? []) {
      if (!isRecord(resume)) continue;
      const layout = resumeLayoutSchema.safeParse(resume.layout);
      if (!layout.success) continue;
      for (const id of layoutReferencedIds(layout.data)) reached.add(id);
    }
    reachedCache = reached;
    return reached;
  }

  function stillNeeded(collectionId: string, key: string, incoming: unknown): boolean {
    const local = collections[collectionId]?.get(key);
    if (local == null) return false;
    if (readUpdatedAt(local) > readUpdatedAt(incoming)) return true;
    if (reachedByLayouts().has(key)) return true;
    return (ownedChildren[collectionId] ?? []).some((child) =>
      (collections[child.collectionId]?.toArray ?? []).some(
        (row) => isRecord(row) && row[child.field] === key,
      ),
    );
  }

  function guard(collectionId: string, collection: RowCollection) {
    const accept = collection.utils.acceptMutations;
    if (compactionGuard in accept) return;
    const guarded = (transaction: ReplayTransaction) => {
      const kept = transaction.mutations.filter((mutation) => {
        const fromCompaction =
          mutation.mutationId != null && inboundOps.delete(mutation.mutationId);
        if (!fromCompaction || mutation.type !== "delete") return true;
        const key = String(mutation.key);
        if (!stillNeeded(collectionId, key, mutation.modified)) return true;
        heldBack.set(`${collectionId}\u241f${key}`, { collectionId, key });
        return false;
      });
      if (collectionId === "resume") reachedCache = null;
      if (kept.length === 0) return;
      if (kept.length === transaction.mutations.length) return accept(transaction);
      return accept({ ...transaction, mutations: kept });
    };
    Object.defineProperty(guarded, compactionGuard, { value: true });
    collection.utils.acceptMutations = guarded;
  }

  /** Parents first, so a server projecting the updates never sees a child before its parent. */
  async function sendHeldBack(): Promise<number> {
    const pending = [...heldBack.values()].sort(
      (a, b) =>
        Number(CHILD_COLLECTIONS.has(a.collectionId)) -
        Number(CHILD_COLLECTIONS.has(b.collectionId)),
    );
    heldBack.clear();
    let sent = 0;
    for (const { collectionId, key } of pending) {
      const collection = collections[collectionId];
      const local = collection?.get(key);
      if (!collection || local == null) continue;
      const updatedAt = Math.max(now(), readUpdatedAt(local) + 1);
      await collection.update(key, (draft) => {
        draft.updatedAt = updatedAt;
      }).isPersisted.promise;
      sent += 1;
    }
    return sent;
  }

  function readRows(): Record<string, Row[]> {
    const rows: Record<string, Row[]> = {};
    for (const collectionId of COMPACTION_INPUT_COLLECTIONS) {
      const collection = collections[collectionId];
      if (!collection) continue;
      rows[collectionId] = collection.toArray.flatMap((row): Row[] => {
        const plain = plainRow(row);
        return plain ? [plain] : [];
      });
    }
    return rows;
  }

  async function propose(db: CompactionDb, baseSeq: number): Promise<AfterSyncOutcome> {
    const prune = request?.prune ?? false;
    const plan = planCompaction(readRows(), { now: now(), prune });
    if (plan.ops.length === 0) {
      request = null;
      planDue = false;
      return { status: "idle" };
    }
    const proposal: CompactionProposal = {
      compactionId: newId(),
      baseSeq,
      prune,
      merged: plan.merged,
      pruned: plan.pruned,
      ops: plan.ops.map(wireOp),
    };
    if (
      proposal.ops.length > MAX_PROPOSAL_OPS ||
      JSON.stringify(proposal).length > MAX_PROPOSAL_BYTES
    ) {
      console.warn("[sync compact] plan too large to propose", { ops: proposal.ops.length });
      return { status: "too-large" };
    }
    lastProposalAt = now();
    const outcome = await options.propose(proposal);
    if (outcome.status === "stale") {
      planDue = true;
      return { status: "stale" };
    }
    planDue = false;
    await db.sync();
    compactionsSeen = 0;
    return { status: "accepted", events: outcome.events };
  }

  return {
    wrapTransport(transport: SyncTransport): SyncTransport {
      return {
        push: (events) => transport.push(events),
        async pull(since) {
          inboundOps.clear();
          reachedCache = null;
          const response = await transport.pull(since);
          observe(response.events);
          return response;
        },
      };
    },

    install(db: { collections: object }) {
      const next: Record<string, RowCollection> = {};
      for (const collectionId of COMPACTION_INPUT_COLLECTIONS) {
        const collection: unknown = Reflect.get(db.collections, collectionId);
        if (!isRowCollection(collection)) continue;
        next[collectionId] = collection;
        guard(collectionId, collection);
      }
      collections = next;
    },

    async afterSync(db: CompactionDb, result: SyncResult): Promise<AfterSyncOutcome> {
      if (result.deferred || result.errors.length > 0) return { status: "skipped" };
      const upstream = compactionsSeen;
      compactionsSeen = 0;

      const resent = await sendHeldBack();
      if (resent > 0) {
        planDue = true;
        await db.sync();
        return { status: "resent", rows: resent };
      }
      if (upstream > 0) return { status: "stood-down" };

      const status = db.getSyncStatus();
      if (status.pendingCount > 0) return { status: "skipped" };
      if (!request && !planDue && result.pushed === 0) return { status: "idle" };
      if (!request && now() - lastProposalAt < minIntervalMs) return { status: "throttled" };
      return propose(db, status.pullCursor);
    },
  };
}

export type SyncCompaction = ReturnType<typeof createSyncCompaction>;
