import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getChallenge, mockR2Fetch, restoreFetch } from "./helpers";
import { seed, TEST_SITE_KEY } from "./seed";

const imageGET = (
  await import("@/app/(main)/api/v0/captcha/image/[sessionToken]/[index]/route")
).GET;

let sharedToken: string;

beforeAll(async () => {
  await seed();
  // One token for validation tests that never hit Redis
  sharedToken = (await getChallenge(TEST_SITE_KEY, "https://example.com"))
    .sessionToken;
});

afterAll(() => {
  restoreFetch();
});

/** Call the image proxy route */
function callImageProxy(sessionToken: string, index: string) {
  return imageGET(
    new Request(
      `http://localhost:3000/api/v0/captcha/image/${sessionToken}/${index}`,
    ),
    { params: Promise.resolve({ sessionToken, index }) },
  );
}

describe("GET /api/v0/captcha/image/[sessionToken]/[index] — real Redis", () => {
  it("returns image with correct headers for valid session and index", async () => {
    // Needs its own token since mockR2Fetch intercepts fetch globally
    const { sessionToken } = await getChallenge(
      TEST_SITE_KEY,
      "https://example.com",
    );
    mockR2Fetch();

    const res = await callImageProxy(sessionToken, "0");

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/webp");
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");

    restoreFetch();
  });

  it("returns 400 for out-of-range index (9)", async () => {
    const res = await callImageProxy(sharedToken, "9");
    expect(res.status).toBe(400);
  });

  it("returns 400 for negative index", async () => {
    const res = await callImageProxy(sharedToken, "-1");
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-numeric index", async () => {
    const res = await callImageProxy(sharedToken, "abc");
    expect(res.status).toBe(400);
  });

  it("returns 404 for invalid/expired session", async () => {
    const res = await callImageProxy("nonexistent-session-token", "0");
    expect(res.status).toBe(404);
  });

  it("fetches each of the 9 image indices successfully", async () => {
    const { sessionToken } = await getChallenge(
      TEST_SITE_KEY,
      "https://example.com",
    );
    mockR2Fetch();

    for (let i = 0; i < 9; i++) {
      const res = await callImageProxy(sessionToken, String(i));
      expect(res.status).toBe(200);
    }

    restoreFetch();
  });
});
