import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  type EventType,
  getDailySeries,
  getDashboardStats,
  getPuzzleStats,
  getSiteStats,
  listPuzzleStatsForUser,
  recordEvent,
} from "@/lib/analytics";
import { db } from "@/lib/db";
import {
  puzzle as puzzleTable,
  site as siteTable,
  verificationEvent,
} from "@/lib/db/app-schema";
import { user } from "@/lib/db/schema";
import {
  cleanup,
  seed,
  TEST_AUDIO_PUZZLE_ID,
  TEST_AUDIO_SITE_ID,
  TEST_COMBINED_PUZZLE_ID,
  TEST_COMBINED_SITE_ID,
  TEST_DISABLED_PUZZLE_ID,
  TEST_HARD_PUZZLE_ID,
  TEST_HARD_SITE_ID,
  TEST_PUZZLE_ID,
  TEST_SITE_ID,
  TEST_USER_ID,
} from "./seed";
import { resetTestUserEvents } from "./setup";

const OTHER_USER_ID = "test-user-analytics-other";
const OTHER_SITE_ID = "test-site-analytics-other";
const OTHER_PUZZLE_ID = "test-puzzle-analytics-other";

beforeAll(async () => {
  await seed();

  // Second user + site + puzzle to verify scope isolation.
  await db
    .insert(user)
    .values({
      id: OTHER_USER_ID,
      name: "Other Analytics User",
      email: "other-analytics@ycaptcha.test",
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();
  await db
    .insert(siteTable)
    .values({
      id: OTHER_SITE_ID,
      userId: OTHER_USER_ID,
      name: "Other Analytics Site",
      domain: null,
      siteKey: "pk_test_analytics_other_1234567",
      secretKey: "sk_test_analytics_other_1234567",
    })
    .onConflictDoNothing();
  await db
    .insert(puzzleTable)
    .values({
      id: OTHER_PUZZLE_ID,
      siteId: OTHER_SITE_ID,
      imageSetId: null,
      prompt: "Other puzzle",
      correctImageIds: [],
      correctCount: 1,
      difficulty: 0.5,
      enabled: true,
      captchaMode: "image",
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db
    .delete(verificationEvent)
    .where(eq(verificationEvent.userId, OTHER_USER_ID));
  await db.delete(puzzleTable).where(eq(puzzleTable.id, OTHER_PUZZLE_ID));
  await db.delete(siteTable).where(eq(siteTable.id, OTHER_SITE_ID));
  await db.delete(user).where(eq(user.id, OTHER_USER_ID));
  await cleanup();
}, 30_000);

// Each test starts from a clean event slate for the test user so counts are
// deterministic regardless of order.
beforeEach(resetTestUserEvents);

async function emit(
  eventType: EventType,
  overrides: {
    userId?: string;
    siteId?: string;
    puzzleId?: string | null;
  } = {},
) {
  await recordEvent({
    userId: overrides.userId ?? TEST_USER_ID,
    siteId: overrides.siteId ?? TEST_SITE_ID,
    puzzleId:
      overrides.puzzleId === undefined ? TEST_PUZZLE_ID : overrides.puzzleId,
    eventType,
  });
}

describe("recordEvent", () => {
  it("writes one row with the given fields", async () => {
    await emit("challenge");

    const rows = await db
      .select()
      .from(verificationEvent)
      .where(eq(verificationEvent.userId, TEST_USER_ID));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userId: TEST_USER_ID,
      siteId: TEST_SITE_ID,
      puzzleId: TEST_PUZZLE_ID,
      eventType: "challenge",
    });
    expect(rows[0].id).toBeDefined();
    expect(rows[0].createdAt).toBeInstanceOf(Date);
  });

  it("accepts null puzzleId (deleted puzzle scenario)", async () => {
    await emit("siteverify", { puzzleId: null });

    const rows = await db
      .select()
      .from(verificationEvent)
      .where(eq(verificationEvent.userId, TEST_USER_ID));

    expect(rows).toHaveLength(1);
    expect(rows[0].puzzleId).toBeNull();
  });
});

describe("getPuzzleStats", () => {
  it("returns zeros with null passRate for a puzzle with no events", async () => {
    const stats = await getPuzzleStats(TEST_PUZZLE_ID);
    expect(stats).toEqual({
      puzzleId: TEST_PUZZLE_ID,
      solves: 0,
      fails: 0,
      passRate: null,
    });
  });

  it("counts pass as solves and fail+auto_fail as fails", async () => {
    await Promise.all([
      emit("challenge"),
      emit("pass"),
      emit("pass"),
      emit("pass"),
      emit("fail"),
      emit("auto_fail"),
      emit("siteverify"),
    ]);

    const stats = await getPuzzleStats(TEST_PUZZLE_ID);
    expect(stats.solves).toBe(3);
    expect(stats.fails).toBe(2); // fail + auto_fail
    // passRate = 3 / (3 + 1 + 1) = 0.6
    expect(stats.passRate).toBeCloseTo(0.6, 5);
  });

  it("is scoped to the given puzzle only", async () => {
    await emit("pass", { puzzleId: TEST_PUZZLE_ID });
    await emit("fail", {
      puzzleId: TEST_HARD_PUZZLE_ID,
      siteId: TEST_HARD_SITE_ID,
    });

    const stats = await getPuzzleStats(TEST_PUZZLE_ID);
    expect(stats.solves).toBe(1);
    expect(stats.fails).toBe(0);
  });
});

describe("getSiteStats", () => {
  it("counts siteverify as verifies and sums pass/fail across puzzles on that site", async () => {
    // Two puzzles live under TEST_SITE_ID: TEST_PUZZLE_ID (enabled) and
    // TEST_DISABLED_PUZZLE_ID (disabled). Events on either count toward site.
    await Promise.all([
      emit("pass", { puzzleId: TEST_PUZZLE_ID }),
      emit("pass", { puzzleId: TEST_DISABLED_PUZZLE_ID }),
      emit("fail", { puzzleId: TEST_PUZZLE_ID }),
      emit("siteverify", { puzzleId: TEST_PUZZLE_ID }),
      emit("siteverify", { puzzleId: TEST_PUZZLE_ID }),
    ]);

    const stats = await getSiteStats(TEST_SITE_ID, TEST_USER_ID);
    expect(stats.verifies).toBe(2);
    expect(stats.passRate).toBeCloseTo(2 / 3, 5); // 2 pass / (2 + 1 + 0)
    expect(stats.activePuzzles).toBe(1); // only enabled puzzles
  });

  it("excludes events from other sites", async () => {
    await emit("pass", {
      puzzleId: TEST_HARD_PUZZLE_ID,
      siteId: TEST_HARD_SITE_ID,
    });

    const stats = await getSiteStats(TEST_SITE_ID, TEST_USER_ID);
    expect(stats.verifies).toBe(0);
    expect(stats.passRate).toBeNull();
  });

  it("excludes events from other users (ownership check)", async () => {
    await emit("siteverify", {
      userId: OTHER_USER_ID,
      siteId: TEST_SITE_ID, // pretend-cross-site
      puzzleId: TEST_PUZZLE_ID,
    });

    const stats = await getSiteStats(TEST_SITE_ID, TEST_USER_ID);
    expect(stats.verifies).toBe(0);
  });
});

describe("getDashboardStats", () => {
  it("sums events across every site the user owns (image, audio, combined)", async () => {
    await Promise.all([
      // image site
      emit("pass", { puzzleId: TEST_PUZZLE_ID, siteId: TEST_SITE_ID }),
      emit("siteverify", { puzzleId: TEST_PUZZLE_ID, siteId: TEST_SITE_ID }),
      // hard image site
      emit("fail", {
        puzzleId: TEST_HARD_PUZZLE_ID,
        siteId: TEST_HARD_SITE_ID,
      }),
      // audio-only site
      emit("pass", {
        puzzleId: TEST_AUDIO_PUZZLE_ID,
        siteId: TEST_AUDIO_SITE_ID,
      }),
      emit("siteverify", {
        puzzleId: TEST_AUDIO_PUZZLE_ID,
        siteId: TEST_AUDIO_SITE_ID,
      }),
      // combined (image+audio) site
      emit("pass", {
        puzzleId: TEST_COMBINED_PUZZLE_ID,
        siteId: TEST_COMBINED_SITE_ID,
      }),
      emit("auto_fail", {
        puzzleId: TEST_COMBINED_PUZZLE_ID,
        siteId: TEST_COMBINED_SITE_ID,
      }),
    ]);

    const stats = await getDashboardStats(TEST_USER_ID);
    expect(stats.verifies).toBe(2);
    // pass=3, fail=1, auto_fail=1 → 3 / 5
    expect(stats.passRate).toBeCloseTo(0.6, 5);
    // TEST_PUZZLE_ID, TEST_HARD_PUZZLE_ID, TEST_AUDIO_PUZZLE_ID,
    // TEST_COMBINED_PUZZLE_ID — 4 enabled. TEST_DISABLED_PUZZLE_ID excluded.
    expect(stats.activePuzzles).toBe(4);
  });

  it("does not leak events from other users", async () => {
    await emit("siteverify", {
      userId: OTHER_USER_ID,
      siteId: OTHER_SITE_ID,
      puzzleId: OTHER_PUZZLE_ID,
    });

    const stats = await getDashboardStats(TEST_USER_ID);
    expect(stats.verifies).toBe(0);
  });
});

describe("listPuzzleStatsForUser", () => {
  it("returns a Map keyed by puzzleId with per-puzzle rollups", async () => {
    await Promise.all([
      emit("pass", { puzzleId: TEST_PUZZLE_ID }),
      emit("pass", { puzzleId: TEST_PUZZLE_ID }),
      emit("fail", { puzzleId: TEST_PUZZLE_ID }),
      emit("pass", {
        puzzleId: TEST_AUDIO_PUZZLE_ID,
        siteId: TEST_AUDIO_SITE_ID,
      }),
    ]);

    const map = await listPuzzleStatsForUser(TEST_USER_ID);

    const image = map.get(TEST_PUZZLE_ID);
    expect(image).toBeDefined();
    expect(image).toMatchObject({
      puzzleId: TEST_PUZZLE_ID,
      solves: 2,
      fails: 1,
    });
    expect(image?.passRate).toBeCloseTo(2 / 3, 5);

    const audio = map.get(TEST_AUDIO_PUZZLE_ID);
    expect(audio).toMatchObject({
      puzzleId: TEST_AUDIO_PUZZLE_ID,
      solves: 1,
      fails: 0,
    });
    expect(audio?.passRate).toBe(1);
  });

  it("excludes events whose puzzle was deleted (null puzzleId)", async () => {
    await Promise.all([
      emit("pass", { puzzleId: TEST_PUZZLE_ID }),
      emit("pass", { puzzleId: null }), // puzzle was deleted post-event
    ]);

    const map = await listPuzzleStatsForUser(TEST_USER_ID);
    expect(map.size).toBe(1);
    expect(map.has(TEST_PUZZLE_ID)).toBe(true);
  });
});

describe("getDailySeries", () => {
  it("returns 30 continuous days with today's events bucketed correctly", async () => {
    await Promise.all([
      emit("siteverify"),
      emit("siteverify"),
      emit("pass"),
      emit("fail"),
      emit("auto_fail"),
    ]);

    const series = await getDailySeries({ userId: TEST_USER_ID });
    expect(series).toHaveLength(30);

    const today = new Date().toISOString().slice(0, 10);
    const last = series[series.length - 1];
    expect(last.date).toBe(today);
    expect(last.verifies).toBe(2);
    expect(last.passes).toBe(1);
    expect(last.fails).toBe(2); // fail + auto_fail combined for the chart

    // Earlier days should all be zero when the test user has no history.
    for (let i = 0; i < 29; i++) {
      expect(series[i]).toMatchObject({ verifies: 0, passes: 0, fails: 0 });
    }
  });

  it("respects the scope filter (siteId vs puzzleId vs userId)", async () => {
    await Promise.all([
      emit("pass", { puzzleId: TEST_PUZZLE_ID, siteId: TEST_SITE_ID }),
      emit("pass", {
        puzzleId: TEST_AUDIO_PUZZLE_ID,
        siteId: TEST_AUDIO_SITE_ID,
      }),
    ]);

    const userSeries = await getDailySeries({ userId: TEST_USER_ID });
    const siteSeries = await getDailySeries({
      userId: TEST_USER_ID,
      siteId: TEST_SITE_ID,
    });
    const puzzleSeries = await getDailySeries({
      puzzleId: TEST_AUDIO_PUZZLE_ID,
    });

    const todayIdx = 29;
    expect(userSeries[todayIdx].passes).toBe(2);
    expect(siteSeries[todayIdx].passes).toBe(1);
    expect(puzzleSeries[todayIdx].passes).toBe(1);
  });
});
