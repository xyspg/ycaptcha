import { and, count, eq, gte, sql } from "drizzle-orm";
import { db } from "./db";
import { puzzle, site, verificationEvent } from "./db/app-schema";

export type EventType =
  | "challenge"
  | "pass"
  | "fail"
  | "auto_fail"
  | "siteverify";

export type Stats = {
  verifies: number; // count of 'siteverify' — the honest "real users protected" number
  passRate: number | null; // pass / (pass + fail + auto_fail), null when no verify attempts
  activePuzzles: number;
};

export type DailyPoint = {
  date: string; // ISO yyyy-mm-dd
  verifies: number;
  passes: number;
  fails: number;
};

export type PuzzleStats = {
  puzzleId: string;
  solves: number;
  fails: number;
  passRate: number | null;
};

const WINDOW_SQL = sql`now() - interval '30 days'`;

export async function recordEvent(input: {
  userId: string;
  siteId: string;
  puzzleId: string | null;
  eventType: EventType;
}): Promise<void> {
  try {
    await db.insert(verificationEvent).values(input);
  } catch (err) {
    // Fire-and-forget: never break the captcha flow because telemetry failed.
    console.error("[analytics] recordEvent failed", err);
  }
}

type Scope = { userId?: string; siteId?: string; puzzleId?: string };

function scopeWhere(scope: Scope) {
  const conds = [gte(verificationEvent.createdAt, WINDOW_SQL)];
  if (scope.userId) conds.push(eq(verificationEvent.userId, scope.userId));
  if (scope.siteId) conds.push(eq(verificationEvent.siteId, scope.siteId));
  if (scope.puzzleId)
    conds.push(eq(verificationEvent.puzzleId, scope.puzzleId));
  return and(...conds);
}

function emptyEventCounts(): Record<EventType, number> {
  return { challenge: 0, pass: 0, fail: 0, auto_fail: 0, siteverify: 0 };
}

async function getEventCounts(
  scope: Scope,
): Promise<Record<EventType, number>> {
  const rows = await db
    .select({ type: verificationEvent.eventType, n: count() })
    .from(verificationEvent)
    .where(scopeWhere(scope))
    .groupBy(verificationEvent.eventType);

  const totals = emptyEventCounts();
  for (const row of rows) {
    if (row.type in totals) {
      totals[row.type as EventType] = Number(row.n);
    }
  }
  return totals;
}

function deriveStatsFromCounts(
  counts: Record<EventType, number>,
  activePuzzles: number,
): Stats {
  const denom = counts.pass + counts.fail + counts.auto_fail;
  return {
    verifies: counts.siteverify,
    passRate: denom === 0 ? null : counts.pass / denom,
    activePuzzles,
  };
}

export async function getDashboardStats(userId: string): Promise<Stats> {
  const [counts, [activeRow]] = await Promise.all([
    getEventCounts({ userId }),
    db
      .select({ n: count() })
      .from(puzzle)
      .innerJoin(site, eq(site.id, puzzle.siteId))
      .where(and(eq(site.userId, userId), eq(puzzle.enabled, true))),
  ]);
  return deriveStatsFromCounts(counts, Number(activeRow?.n ?? 0));
}

export async function getSiteStats(
  siteId: string,
  userId: string,
): Promise<Stats> {
  const [counts, [activeRow]] = await Promise.all([
    getEventCounts({ siteId, userId }),
    db
      .select({ n: count() })
      .from(puzzle)
      .where(and(eq(puzzle.siteId, siteId), eq(puzzle.enabled, true))),
  ]);
  return deriveStatsFromCounts(counts, Number(activeRow?.n ?? 0));
}

export async function getPuzzleStats(puzzleId: string): Promise<PuzzleStats> {
  const counts = await getEventCounts({ puzzleId });
  const denom = counts.pass + counts.fail + counts.auto_fail;
  return {
    puzzleId,
    solves: counts.pass,
    fails: counts.fail + counts.auto_fail,
    passRate: denom === 0 ? null : counts.pass / denom,
  };
}

async function listPuzzleStats(
  scope: Scope,
): Promise<Map<string, PuzzleStats>> {
  const rows = await db
    .select({
      puzzleId: verificationEvent.puzzleId,
      type: verificationEvent.eventType,
      n: count(),
    })
    .from(verificationEvent)
    .where(scopeWhere(scope))
    .groupBy(verificationEvent.puzzleId, verificationEvent.eventType);

  const byPuzzle = new Map<string, Record<EventType, number>>();
  for (const row of rows) {
    if (!row.puzzleId) continue; // skip events whose puzzle was deleted
    let bucket = byPuzzle.get(row.puzzleId);
    if (!bucket) {
      bucket = emptyEventCounts();
      byPuzzle.set(row.puzzleId, bucket);
    }
    if (row.type in bucket) {
      bucket[row.type as EventType] = Number(row.n);
    }
  }

  const out = new Map<string, PuzzleStats>();
  for (const [puzzleId, c] of byPuzzle) {
    const denom = c.pass + c.fail + c.auto_fail;
    out.set(puzzleId, {
      puzzleId,
      solves: c.pass,
      fails: c.fail + c.auto_fail,
      passRate: denom === 0 ? null : c.pass / denom,
    });
  }
  return out;
}

export function listPuzzleStatsForUser(
  userId: string,
): Promise<Map<string, PuzzleStats>> {
  return listPuzzleStats({ userId });
}

export async function getDailySeries(scope: Scope): Promise<DailyPoint[]> {
  const dayExpr = sql<string>`to_char(date_trunc('day', ${verificationEvent.createdAt}), 'YYYY-MM-DD')`;

  const rows = await db
    .select({
      day: dayExpr,
      type: verificationEvent.eventType,
      n: count(),
    })
    .from(verificationEvent)
    .where(scopeWhere(scope))
    .groupBy(dayExpr, verificationEvent.eventType);

  const buckets = new Map<string, DailyPoint>();
  // Pre-fill 30 days so the chart has continuous x-axis even with sparse data.
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { date: key, verifies: 0, passes: 0, fails: 0 });
  }

  for (const row of rows) {
    const point = buckets.get(row.day);
    if (!point) continue;
    const n = Number(row.n);
    if (row.type === "siteverify") point.verifies += n;
    else if (row.type === "pass") point.passes += n;
    else if (row.type === "fail" || row.type === "auto_fail") point.fails += n;
  }

  return [...buckets.values()];
}
