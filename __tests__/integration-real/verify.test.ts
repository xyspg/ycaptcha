import { describe, it, expect, beforeAll } from "vitest";
import { seed, TEST_SITE_KEY, TEST_HARD_SITE_KEY } from "./seed";
import {
  postRequest,
  getChallenge,
  getChallengeIndices,
  getCorrectIndices,
} from "./helpers";
import { deleteChallengeSession } from "@/lib/captcha-session";

const verifyPOST = (await import("@/app/api/v0/captcha/verify/route")).POST;

beforeAll(async () => {
  await seed();
});

describe("POST /api/v0/captcha/verify — real DB + Redis", () => {
  it("returns success with correct selections", async () => {
    const { sessionToken } = await getChallenge(
      TEST_SITE_KEY,
      "https://example.com",
    );
    const correctIndices = await getCorrectIndices(sessionToken);

    const res = await verifyPOST(
      postRequest({ sessionToken, selectedIndices: correctIndices }),
    );
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.token).toBeDefined();
    expect(typeof data.token).toBe("string");
  });

  it("returns success: false with wrong selections", async () => {
    const { sessionToken } = await getChallenge(
      TEST_SITE_KEY,
      "https://example.com",
    );
    const { incorrect } = await getChallengeIndices(sessionToken);

    const res = await verifyPOST(
      postRequest({ sessionToken, selectedIndices: incorrect.slice(0, 3) }),
    );
    const data = await res.json();

    expect(data.success).toBe(false);
  });

  it("returns success: false when all 9 selected (anti-bot)", async () => {
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
    const data = await res.json();

    expect(data.success).toBe(false);
  });

  it("returns success: false with empty selection", async () => {
    const { sessionToken } = await getChallenge(
      TEST_SITE_KEY,
      "https://example.com",
    );

    const res = await verifyPOST(
      postRequest({ sessionToken, selectedIndices: [] }),
    );
    const data = await res.json();

    expect(data.success).toBe(false);
  });

  it("returns 400 for invalid sessionToken", async () => {
    const res = await verifyPOST(
      postRequest({
        sessionToken: "nonexistent-token",
        selectedIndices: [0],
      }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it("returns 400 for expired (deleted) session", async () => {
    const { sessionToken } = await getChallenge(
      TEST_SITE_KEY,
      "https://example.com",
    );

    // Simulate expiry by deleting the session
    await deleteChallengeSession(sessionToken);

    const res = await verifyPOST(
      postRequest({ sessionToken, selectedIndices: [0] }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it("difficulty 1.0: partial correct fails, all correct passes", async () => {
    // Hard site has difficulty 1.0, correctCount 3 → need ceil(3 * 1.0) = 3
    const { sessionToken: tok1 } = await getChallenge(TEST_HARD_SITE_KEY);
    const correctIndices1 = await getCorrectIndices(tok1);

    // Submit only 2 of 3 correct → should fail
    const res1 = await verifyPOST(
      postRequest({
        sessionToken: tok1,
        selectedIndices: correctIndices1.slice(0, 2),
      }),
    );
    expect((await res1.json()).success).toBe(false);

    // New challenge — submit all correct → should pass
    const { sessionToken: tok2 } = await getChallenge(TEST_HARD_SITE_KEY);
    const correctIndices2 = await getCorrectIndices(tok2);

    const res2 = await verifyPOST(
      postRequest({
        sessionToken: tok2,
        selectedIndices: correctIndices2,
      }),
    );
    expect((await res2.json()).success).toBe(true);
  });
});
