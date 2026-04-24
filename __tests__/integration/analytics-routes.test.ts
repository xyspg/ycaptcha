import { desc, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { verificationEvent } from "@/lib/db/app-schema";
import {
  getAudioVerificationToken,
  getChallenge,
  getCorrectIndices,
  getVerificationToken,
  postRequest,
} from "./helpers";
import {
  cleanup,
  seed,
  TEST_AUDIO_ANSWER,
  TEST_AUDIO_PUZZLE_ID,
  TEST_AUDIO_SECRET_KEY,
  TEST_AUDIO_SITE_ID,
  TEST_AUDIO_SITE_KEY,
  TEST_COMBINED_PUZZLE_ID,
  TEST_COMBINED_SECRET_KEY,
  TEST_COMBINED_SITE_ID,
  TEST_COMBINED_SITE_KEY,
  TEST_HARD_PUZZLE_ID,
  TEST_HARD_SITE_ID,
  TEST_HARD_SITE_KEY,
  TEST_PUZZLE_ID,
  TEST_SECRET_KEY,
  TEST_SITE_ID,
  TEST_SITE_KEY,
  TEST_USER_ID,
} from "./seed";
import { flushAfter, resetTestUserEvents } from "./setup";

const verifyPOST = (await import("@/app/(main)/api/v0/captcha/verify/route"))
  .POST;
const siteverifyPOST = (
  await import("@/app/(main)/api/v0/captcha/siteverify/route")
).POST;

async function events() {
  await flushAfter();
  return db
    .select()
    .from(verificationEvent)
    .where(eq(verificationEvent.userId, TEST_USER_ID))
    .orderBy(desc(verificationEvent.createdAt));
}

async function typeCounts(): Promise<Record<string, number>> {
  const rows = await events();
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.eventType] = (counts[r.eventType] ?? 0) + 1;
  return counts;
}

beforeAll(async () => {
  await seed();
});

afterAll(async () => {
  await cleanup();
}, 30_000);

beforeEach(resetTestUserEvents);

describe("challenge route emits events", () => {
  it("records one 'challenge' event per challenge issued", async () => {
    await getChallenge(TEST_SITE_KEY, "https://example.com");

    const rows = await events();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      eventType: "challenge",
      siteId: TEST_SITE_ID,
      puzzleId: TEST_PUZZLE_ID,
      userId: TEST_USER_ID,
    });
  });

  it("tags the correct puzzleId for audio-only sites", async () => {
    await getChallenge(TEST_AUDIO_SITE_KEY);
    const rows = await events();
    expect(rows[0]).toMatchObject({
      eventType: "challenge",
      siteId: TEST_AUDIO_SITE_ID,
      puzzleId: TEST_AUDIO_PUZZLE_ID,
    });
  });
});

describe("verify route — image mode", () => {
  it("emits 'pass' for a correct selection", async () => {
    const { sessionToken } = await getChallenge(
      TEST_SITE_KEY,
      "https://example.com",
    );
    const correct = await getCorrectIndices(sessionToken);
    const res = await verifyPOST(
      postRequest({ sessionToken, selectedIndices: correct }),
    );
    expect((await res.json()).success).toBe(true);

    expect(await typeCounts()).toEqual({ challenge: 1, pass: 1 });
  });

  it("emits 'fail' when the score is below the threshold", async () => {
    const { sessionToken } = await getChallenge(
      TEST_HARD_SITE_KEY, // difficulty 1.0 → needs all 3 correct
    );
    const res = await verifyPOST(
      postRequest({ sessionToken, selectedIndices: [0] }), // definitely not 3
    );
    expect((await res.json()).success).toBe(false);

    expect(await typeCounts()).toEqual({ challenge: 1, fail: 1 });
    const rows = await events();
    const fail = rows.find((r) => r.eventType === "fail");
    expect(fail).toMatchObject({
      puzzleId: TEST_HARD_PUZZLE_ID,
      siteId: TEST_HARD_SITE_ID,
    });
  });

  it("emits 'auto_fail' when all 9 tiles are selected", async () => {
    const { sessionToken } = await getChallenge(
      TEST_SITE_KEY,
      "https://example.com",
    );
    const res = await verifyPOST(
      postRequest({
        sessionToken,
        selectedIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8],
      }),
    );
    expect((await res.json()).success).toBe(false);

    expect(await typeCounts()).toEqual({ challenge: 1, auto_fail: 1 });
  });

  it("does NOT emit an event for empty or invalid selections", async () => {
    const { sessionToken } = await getChallenge(
      TEST_SITE_KEY,
      "https://example.com",
    );

    await verifyPOST(postRequest({ sessionToken, selectedIndices: [] }));
    await verifyPOST(
      postRequest({ sessionToken, selectedIndices: [99] }), // invalid index
    );

    expect(await typeCounts()).toEqual({ challenge: 1 });
  });
});

describe("verify route — audio mode", () => {
  it("emits 'pass' for the correct text answer", async () => {
    const { sessionToken } = await getChallenge(TEST_AUDIO_SITE_KEY);
    const res = await verifyPOST(
      postRequest({ sessionToken, textAnswer: TEST_AUDIO_ANSWER }),
    );
    expect((await res.json()).success).toBe(true);

    expect(await typeCounts()).toEqual({ challenge: 1, pass: 1 });
  });

  it("emits 'fail' for a wrong text answer", async () => {
    const { sessionToken } = await getChallenge(TEST_AUDIO_SITE_KEY);
    const res = await verifyPOST(
      postRequest({ sessionToken, textAnswer: "not-the-answer" }),
    );
    expect((await res.json()).success).toBe(false);

    expect(await typeCounts()).toEqual({ challenge: 1, fail: 1 });
  });

  it("does NOT emit an event for an empty text answer", async () => {
    const { sessionToken } = await getChallenge(TEST_AUDIO_SITE_KEY);
    await verifyPOST(postRequest({ sessionToken, textAnswer: "  " })); // whitespace

    expect(await typeCounts()).toEqual({ challenge: 1 });
  });
});

describe("verify route — combined mode", () => {
  it("emits 'pass' when the image path is taken", async () => {
    const { sessionToken } = await getChallenge(TEST_COMBINED_SITE_KEY);
    const correct = await getCorrectIndices(sessionToken);
    const res = await verifyPOST(
      postRequest({ sessionToken, selectedIndices: correct }),
    );
    expect((await res.json()).success).toBe(true);

    expect(await typeCounts()).toEqual({ challenge: 1, pass: 1 });
    const rows = await events();
    const pass = rows.find((r) => r.eventType === "pass");
    expect(pass).toMatchObject({
      puzzleId: TEST_COMBINED_PUZZLE_ID,
      siteId: TEST_COMBINED_SITE_ID,
    });
  });

  it("emits 'pass' when the audio path is taken", async () => {
    const { sessionToken } = await getChallenge(TEST_COMBINED_SITE_KEY);
    const res = await verifyPOST(
      postRequest({ sessionToken, textAnswer: TEST_AUDIO_ANSWER }),
    );
    expect((await res.json()).success).toBe(true);

    expect(await typeCounts()).toEqual({ challenge: 1, pass: 1 });
  });
});

describe("siteverify route", () => {
  it("emits 'siteverify' exactly once on successful consumption", async () => {
    const verifyToken = await getVerificationToken(
      TEST_SITE_KEY,
      "https://example.com",
    );
    const res = await siteverifyPOST(
      postRequest({ token: verifyToken, secretKey: TEST_SECRET_KEY }),
    );
    expect((await res.json()).success).toBe(true);

    expect(await typeCounts()).toEqual({
      challenge: 1,
      pass: 1,
      siteverify: 1,
    });
  });

  it("does NOT emit 'siteverify' when the secretKey is wrong", async () => {
    const verifyToken = await getVerificationToken(
      TEST_SITE_KEY,
      "https://example.com",
    );
    const res = await siteverifyPOST(
      postRequest({ token: verifyToken, secretKey: "sk_not_the_key" }),
    );
    expect((await res.json()).success).toBe(false);

    expect(await typeCounts()).toEqual({ challenge: 1, pass: 1 });
  });

  it("does NOT emit when the token is already consumed (replay)", async () => {
    const verifyToken = await getVerificationToken(
      TEST_SITE_KEY,
      "https://example.com",
    );
    await siteverifyPOST(
      postRequest({ token: verifyToken, secretKey: TEST_SECRET_KEY }),
    );

    // replay → invalid token → no additional event
    await siteverifyPOST(
      postRequest({ token: verifyToken, secretKey: TEST_SECRET_KEY }),
    );

    expect(await typeCounts()).toEqual({
      challenge: 1,
      pass: 1,
      siteverify: 1,
    });
  });

  it("records siteverify against the correct site and puzzle for audio flow", async () => {
    const verifyToken = await getAudioVerificationToken(
      TEST_AUDIO_SITE_KEY,
      TEST_AUDIO_ANSWER,
    );
    await siteverifyPOST(
      postRequest({ token: verifyToken, secretKey: TEST_AUDIO_SECRET_KEY }),
    );

    expect(await typeCounts()).toEqual({
      challenge: 1,
      pass: 1,
      siteverify: 1,
    });
    const rows = await events();
    const siteverify = rows.find((r) => r.eventType === "siteverify");
    expect(siteverify).toMatchObject({
      siteId: TEST_AUDIO_SITE_ID,
      puzzleId: TEST_AUDIO_PUZZLE_ID,
    });
  });

  it("records siteverify for combined-mode audio pass", async () => {
    const verifyToken = await getAudioVerificationToken(
      TEST_COMBINED_SITE_KEY,
      TEST_AUDIO_ANSWER,
    );
    await siteverifyPOST(
      postRequest({
        token: verifyToken,
        secretKey: TEST_COMBINED_SECRET_KEY,
      }),
    );

    const rows = await events();
    const siteverify = rows.find((r) => r.eventType === "siteverify");
    expect(siteverify).toMatchObject({
      siteId: TEST_COMBINED_SITE_ID,
      puzzleId: TEST_COMBINED_PUZZLE_ID,
    });
  });
});
