import { describe, it, expect, vi, beforeEach } from "vitest";
import { chainResult, makePostRequest } from "../helpers";

const mockDb = {
  select: vi.fn(),
  delete: vi.fn(),
};
vi.mocked(await import("@/lib/db")).db = mockDb as any;

const { POST } = await import("@/app/api/v0/captcha/siteverify/route");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/v0/captcha/siteverify", () => {
  it("returns 400 when params are missing", async () => {
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns success: false for invalid token", async () => {
    mockDb.select.mockReturnValueOnce(chainResult([]));

    const res = await POST(
      makePostRequest({ token: "bad", secretKey: "sk_test" }),
    );
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("Invalid token");
  });

  it("returns success: false for wrong secretKey", async () => {
    mockDb.select
      // session found
      .mockReturnValueOnce(
        chainResult([
          {
            id: "cs1",
            puzzleId: "p1",
            solved: true,
            expiresAt: new Date(Date.now() + 60_000),
          },
        ]),
      )
      // owner check fails
      .mockReturnValueOnce(chainResult([]));

    const res = await POST(
      makePostRequest({ token: "tok1", secretKey: "sk_wrong" }),
    );
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("Invalid secretKey");
  });

  it("returns success: false for unsolved session", async () => {
    mockDb.select
      .mockReturnValueOnce(
        chainResult([
          {
            id: "cs1",
            puzzleId: "p1",
            solved: false,
            expiresAt: new Date(Date.now() + 60_000),
          },
        ]),
      )
      .mockReturnValueOnce(chainResult([{ siteId: "s1" }]));

    const res = await POST(
      makePostRequest({ token: "tok1", secretKey: "sk_test" }),
    );
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("Challenge not solved");
  });

  it("returns success: false for expired session", async () => {
    mockDb.select
      .mockReturnValueOnce(
        chainResult([
          {
            id: "cs1",
            puzzleId: "p1",
            solved: true,
            expiresAt: new Date(Date.now() - 60_000), // expired
          },
        ]),
      )
      .mockReturnValueOnce(chainResult([{ siteId: "s1" }]));

    const res = await POST(
      makePostRequest({ token: "tok1", secretKey: "sk_test" }),
    );
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("Token expired");
  });

  it("returns success: true and deletes session on valid token", async () => {
    mockDb.select
      .mockReturnValueOnce(
        chainResult([
          {
            id: "cs1",
            puzzleId: "p1",
            solved: true,
            expiresAt: new Date(Date.now() + 60_000),
          },
        ]),
      )
      .mockReturnValueOnce(chainResult([{ siteId: "s1" }]));

    mockDb.delete.mockReturnValue(chainResult(undefined));

    const res = await POST(
      makePostRequest({ token: "tok1", secretKey: "sk_test" }),
    );
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockDb.delete).toHaveBeenCalled();
  });
});
