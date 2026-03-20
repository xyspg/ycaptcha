import { describe, it, expect, vi, beforeEach } from "vitest";
import { chainResult, makePostRequest } from "../helpers";

const mockDb = {
  select: vi.fn(),
  update: vi.fn(),
};
vi.mocked(await import("@/lib/db")).db = mockDb as any;

const { POST } = await import("@/app/api/v0/captcha/verify/route");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/v0/captcha/verify", () => {
  it("returns 400 when params are missing", async () => {
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid/expired session", async () => {
    mockDb.select.mockReturnValue(chainResult([]));

    const res = await POST(
      makePostRequest({ sessionToken: "bad", selectedIds: ["a"] }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ success: false });
  });

  it("returns success: false when all 9 images selected (anti-bot)", async () => {
    mockDb.select.mockReturnValue(
      chainResult([
        {
          sessionId: "cs1",
          sessionToken: "tok1",
          correctImageIds: ["a", "b"],
          difficulty: 0.5,
        },
      ]),
    );

    const allNine = Array.from({ length: 9 }, (_, i) => `img${i}`);
    const res = await POST(
      makePostRequest({ sessionToken: "tok1", selectedIds: allNine }),
    );
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it("returns success: false with insufficient correct selections", async () => {
    // 4 correct images, difficulty 0.5 → need ceil(4*0.5)=2 correct
    mockDb.select.mockReturnValue(
      chainResult([
        {
          sessionId: "cs1",
          sessionToken: "tok1",
          correctImageIds: ["a", "b", "c", "d"],
          difficulty: 0.5,
        },
      ]),
    );

    // Select 1 correct + 1 wrong → only 1 correct, need 2
    const res = await POST(
      makePostRequest({ sessionToken: "tok1", selectedIds: ["a", "wrong"] }),
    );
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it("returns success: true with sufficient correct selections", async () => {
    mockDb.select.mockReturnValue(
      chainResult([
        {
          sessionId: "cs1",
          sessionToken: "tok1",
          correctImageIds: ["a", "b", "c", "d"],
          difficulty: 0.5,
        },
      ]),
    );
    mockDb.update.mockReturnValue(chainResult(undefined));

    // 2 correct out of 4 with 0.5 difficulty → need 2, have 2
    const res = await POST(
      makePostRequest({ sessionToken: "tok1", selectedIds: ["a", "b"] }),
    );
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.token).toBe("tok1");
  });

  it("requires all correct images at difficulty 1.0", async () => {
    mockDb.select.mockReturnValue(
      chainResult([
        {
          sessionId: "cs1",
          sessionToken: "tok1",
          correctImageIds: ["a", "b", "c"],
          difficulty: 1.0,
        },
      ]),
    );

    // Only 2 of 3 correct with difficulty 1.0 → need 3
    const res = await POST(
      makePostRequest({ sessionToken: "tok1", selectedIds: ["a", "b"] }),
    );
    const data = await res.json();
    expect(data.success).toBe(false);
  });
});
