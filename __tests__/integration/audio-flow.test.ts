import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  getAudioVerificationToken,
  getChallenge,
  getVerificationToken,
  mockR2Fetch,
  postRequest,
  restoreFetch,
} from "./helpers";
import {
  cleanup,
  seed,
  TEST_AUDIO_ANSWER,
  TEST_AUDIO_SECRET_KEY,
  TEST_AUDIO_SITE_KEY,
  TEST_AUDIO_URL,
  TEST_COMBINED_SECRET_KEY,
  TEST_COMBINED_SITE_KEY,
  TEST_SITE_KEY,
} from "./seed";

const challengePOST = (
  await import("@/app/(main)/api/v0/captcha/challenge/route")
).POST;
const verifyPOST = (await import("@/app/(main)/api/v0/captcha/verify/route"))
  .POST;
const siteverifyPOST = (
  await import("@/app/(main)/api/v0/captcha/siteverify/route")
).POST;
const audioGET = (
  await import("@/app/(main)/api/v0/captcha/audio/[sessionToken]/route")
).GET;

beforeAll(async () => {
  await seed();
});

afterAll(async () => {
  restoreFetch();
  await cleanup();
}, 30_000);

describe("Audio CAPTCHA — challenge response shape", () => {
  it("audio-only puzzle returns audioEnabled and no images", async () => {
    const res = await challengePOST(
      postRequest({ siteKey: TEST_AUDIO_SITE_KEY }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.captchaMode).toBe("audio");
    expect(body.audioEnabled).toBe(true);
    expect(body.images).toBeUndefined();
    expect(body.sessionToken).toBeTruthy();
    expect(body.prompt).toBe("Type what you hear");
  });

  it("combined puzzle returns audioEnabled and 9 images", async () => {
    const res = await challengePOST(
      postRequest({ siteKey: TEST_COMBINED_SITE_KEY }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.captchaMode).toBe("combined");
    expect(body.audioEnabled).toBe(true);
    expect(body.images).toHaveLength(9);
    for (const img of body.images) {
      expect(img.url).toMatch(/\/api\/v0\/captcha\/image\/.+\/\d+/);
    }
  });

  it("image-only puzzle returns audioEnabled=false", async () => {
    // TEST_SITE_KEY's site has domain="example.com" so origin must match.
    const res = await challengePOST(
      postRequest({
        siteKey: TEST_SITE_KEY,
        origin: "https://example.com",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.captchaMode).toBe("image");
    expect(body.audioEnabled).toBe(false);
    expect(body.images).toHaveLength(9);
  });
});

describe("Audio CAPTCHA — verify with text answer", () => {
  async function freshAudioSession() {
    return (await getChallenge(TEST_AUDIO_SITE_KEY)).sessionToken;
  }

  it("correct text answer succeeds", async () => {
    const sessionToken = await freshAudioSession();
    const res = await verifyPOST(
      postRequest({ sessionToken, textAnswer: TEST_AUDIO_ANSWER }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.token).toBeTruthy();
  });

  it("comparison is case-insensitive", async () => {
    const sessionToken = await freshAudioSession();
    const res = await verifyPOST(
      postRequest({
        sessionToken,
        textAnswer: TEST_AUDIO_ANSWER.toUpperCase(),
      }),
    );
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("trims surrounding whitespace", async () => {
    const sessionToken = await freshAudioSession();
    const res = await verifyPOST(
      postRequest({
        sessionToken,
        textAnswer: `   ${TEST_AUDIO_ANSWER}\n`,
      }),
    );
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("wrong text answer fails", async () => {
    const sessionToken = await freshAudioSession();
    const res = await verifyPOST(
      postRequest({ sessionToken, textAnswer: "totally wrong" }),
    );
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.token).toBeUndefined();
  });

  it("empty text answer fails without consuming session", async () => {
    const sessionToken = await freshAudioSession();
    const empty = await verifyPOST(
      postRequest({ sessionToken, textAnswer: "" }),
    );
    expect((await empty.json()).success).toBe(false);

    // session still alive — the correct answer should still pass
    const correct = await verifyPOST(
      postRequest({ sessionToken, textAnswer: TEST_AUDIO_ANSWER }),
    );
    expect((await correct.json()).success).toBe(true);
  });

  it("session is consumed on a wrong-but-non-empty answer (no replay)", async () => {
    const sessionToken = await freshAudioSession();
    await verifyPOST(postRequest({ sessionToken, textAnswer: "nope" }));

    const replay = await verifyPOST(
      postRequest({ sessionToken, textAnswer: TEST_AUDIO_ANSWER }),
    );
    expect(replay.status).toBe(400);
    expect((await replay.json()).error).toContain("Invalid or expired session");
  });
});

describe("Audio CAPTCHA — verify mode mismatches", () => {
  it("textAnswer against an image-only puzzle session is rejected", async () => {
    const { sessionToken } = await getChallenge(
      TEST_SITE_KEY,
      "https://example.com",
    );

    const res = await verifyPOST(
      postRequest({ sessionToken, textAnswer: TEST_AUDIO_ANSWER }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Audio not configured");
  });

  it("selectedIndices on an audio-only session never passes", async () => {
    const { sessionToken } = await getChallenge(TEST_AUDIO_SITE_KEY);

    // The route accepts the request shape but the session has no imageIds,
    // so the score is negative and verification fails. The audio puzzle is
    // never bypassable from the image path.
    const res = await verifyPOST(
      postRequest({ sessionToken, selectedIndices: [0] }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.token).toBeUndefined();
  });

  it("missing both textAnswer and selectedIndices is rejected", async () => {
    const { sessionToken } = await getChallenge(TEST_AUDIO_SITE_KEY);

    const res = await verifyPOST(postRequest({ sessionToken }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain(
      "Missing textAnswer or selectedIndices",
    );
  });
});

describe("Audio proxy route", () => {
  it("serves audio bytes through the proxy", async () => {
    mockR2Fetch();
    try {
      const { sessionToken } = await getChallenge(TEST_AUDIO_SITE_KEY);
      const res = await audioGET(
        new Request(
          `http://localhost:3000/api/v0/captcha/audio/${sessionToken}`,
        ),
        { params: Promise.resolve({ sessionToken }) },
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toMatch(/audio\//);
      expect(res.headers.get("Cache-Control")).toContain("no-store");
    } finally {
      restoreFetch();
    }
  });

  it("returns 404 for an unknown session token", async () => {
    const res = await audioGET(
      new Request("http://localhost:3000/api/v0/captcha/audio/fake-token"),
      { params: Promise.resolve({ sessionToken: "fake-token" }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 for an image-only session (no audio configured)", async () => {
    const { sessionToken } = await getChallenge(
      TEST_SITE_KEY,
      "https://example.com",
    );

    const res = await audioGET(
      new Request(`http://localhost:3000/api/v0/captcha/audio/${sessionToken}`),
      { params: Promise.resolve({ sessionToken }) },
    );
    expect(res.status).toBe(404);
  });

  it("does not expose the underlying R2 URL", async () => {
    mockR2Fetch();
    try {
      const { sessionToken } = await getChallenge(TEST_AUDIO_SITE_KEY);
      const res = await audioGET(
        new Request(
          `http://localhost:3000/api/v0/captcha/audio/${sessionToken}`,
        ),
        { params: Promise.resolve({ sessionToken }) },
      );
      // No header should leak the upstream URL.
      const allHeaderValues = [...res.headers.values()].join(" ");
      expect(allHeaderValues).not.toContain(TEST_AUDIO_URL);
    } finally {
      restoreFetch();
    }
  });
});

describe("Audio CAPTCHA — full lifecycle", () => {
  it("audio-only: challenge → verify text → siteverify → replay rejected", async () => {
    const token = await getAudioVerificationToken(
      TEST_AUDIO_SITE_KEY,
      TEST_AUDIO_ANSWER,
    );
    expect(token).toBeTruthy();

    const sv1 = await siteverifyPOST(
      postRequest({ token, secretKey: TEST_AUDIO_SECRET_KEY }),
    );
    expect((await sv1.json()).success).toBe(true);

    const sv2 = await siteverifyPOST(
      postRequest({ token, secretKey: TEST_AUDIO_SECRET_KEY }),
    );
    expect((await sv2.json()).success).toBe(false);
  });

  it("combined: image-mode verify works on a combined puzzle", async () => {
    const token = await getVerificationToken(TEST_COMBINED_SITE_KEY);
    expect(token).toBeTruthy();

    const sv = await siteverifyPOST(
      postRequest({ token, secretKey: TEST_COMBINED_SECRET_KEY }),
    );
    expect((await sv.json()).success).toBe(true);
  });

  it("combined: audio-mode verify works on the same puzzle (separate session)", async () => {
    const token = await getAudioVerificationToken(
      TEST_COMBINED_SITE_KEY,
      TEST_AUDIO_ANSWER,
    );
    expect(token).toBeTruthy();

    const sv = await siteverifyPOST(
      postRequest({ token, secretKey: TEST_COMBINED_SECRET_KEY }),
    );
    expect((await sv.json()).success).toBe(true);
  });
});
