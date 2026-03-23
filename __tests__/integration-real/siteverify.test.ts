import { describe, it, expect, beforeAll } from "vitest";
import { seed, TEST_SITE_KEY, TEST_SECRET_KEY } from "./seed";
import { postRequest, getChallenge, getVerificationToken } from "./helpers";

const siteverifyPOST = (
  await import("@/app/api/v0/captcha/siteverify/route")
).POST;

beforeAll(async () => {
  await seed();
});

describe("POST /api/v0/captcha/siteverify — real DB + Redis", () => {
  it("full flow: challenge → verify → siteverify succeeds", async () => {
    const token = await getVerificationToken(
      TEST_SITE_KEY,
      "https://example.com",
    );

    const res = await siteverifyPOST(
      postRequest({ token, secretKey: TEST_SECRET_KEY }),
    );
    const data = await res.json();

    expect(data.success).toBe(true);
  });

  it("fails with wrong secretKey", async () => {
    const token = await getVerificationToken(
      TEST_SITE_KEY,
      "https://example.com",
    );

    const res = await siteverifyPOST(
      postRequest({ token, secretKey: "sk_wrong_key_here" }),
    );
    const data = await res.json();

    expect(data.success).toBe(false);
    expect(data.error).toBe("Invalid secretKey");
  });

  it("fails with invalid/nonexistent token", async () => {
    const res = await siteverifyPOST(
      postRequest({ token: "nonexistent-token", secretKey: TEST_SECRET_KEY }),
    );
    const data = await res.json();

    expect(data.success).toBe(false);
    expect(data.error).toBe("Invalid token");
  });

  it("double siteverify: first succeeds, second fails (one-time use)", async () => {
    const token = await getVerificationToken(
      TEST_SITE_KEY,
      "https://example.com",
    );

    const res1 = await siteverifyPOST(
      postRequest({ token, secretKey: TEST_SECRET_KEY }),
    );
    expect((await res1.json()).success).toBe(true);

    const res2 = await siteverifyPOST(
      postRequest({ token, secretKey: TEST_SECRET_KEY }),
    );
    const data2 = await res2.json();
    expect(data2.success).toBe(false);
    expect(data2.error).toBe("Invalid token");
  });

  it("fails when verify step was never completed", async () => {
    // Create a challenge but don't verify — token doesn't exist in verified store
    const { sessionToken } = await getChallenge(
      TEST_SITE_KEY,
      "https://example.com",
    );

    // Try siteverify with the challenge session token (wrong store)
    const res = await siteverifyPOST(
      postRequest({ token: sessionToken, secretKey: TEST_SECRET_KEY }),
    );
    const data = await res.json();

    expect(data.success).toBe(false);
    expect(data.error).toBe("Invalid token");
  });
});
