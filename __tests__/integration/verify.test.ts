import { describe, it, expect, vi, beforeEach } from "vitest";
import { makePostRequest } from "../helpers";

// Mock captcha-session module
const mockGetChallengeSession = vi.fn();
const mockDeleteChallengeSession = vi.fn().mockResolvedValue(undefined);
const mockCreateVerifiedSession = vi.fn().mockResolvedValue("verify-token-123");
vi.mock("@/lib/captcha-session", () => ({
  getChallengeSession: (...args: unknown[]) => mockGetChallengeSession(...args),
  deleteChallengeSession: (...args: unknown[]) => mockDeleteChallengeSession(...args),
  createVerifiedSession: (...args: unknown[]) => mockCreateVerifiedSession(...args),
}));

const { POST } = await import("@/app/api/v0/captcha/verify/route");

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateVerifiedSession.mockResolvedValue("verify-token-123");
});

describe("POST /api/v0/captcha/verify", () => {
  it("returns 400 when params are missing", async () => {
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid/expired session", async () => {
    mockGetChallengeSession.mockResolvedValue(null);

    const res = await POST(
      makePostRequest({ sessionToken: "bad", selectedIds: ["a"] }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ success: false });
  });

  it("returns success: false when all 9 images selected (anti-bot)", async () => {
    mockGetChallengeSession.mockResolvedValue({
      puzzleId: "p1",
      siteId: "s1",
      correctImageIds: ["a", "b"],
      correctCount: 2,
      difficulty: 0.5,
    });

    const allNine = Array.from({ length: 9 }, (_, i) => `img${i}`);
    const res = await POST(
      makePostRequest({ sessionToken: "tok1", selectedIds: allNine }),
    );
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it("returns success: false with insufficient correct selections", async () => {
    // correctCount 4, difficulty 0.5 → need ceil(4*0.5)=2 correct
    mockGetChallengeSession.mockResolvedValue({
      puzzleId: "p1",
      siteId: "s1",
      correctImageIds: ["a", "b", "c", "d"],
      correctCount: 4,
      difficulty: 0.5,
    });

    // Select 1 correct + 1 wrong → only 1 correct, need 2
    const res = await POST(
      makePostRequest({ sessionToken: "tok1", selectedIds: ["a", "wrong"] }),
    );
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it("returns success: true with sufficient correct selections", async () => {
    mockGetChallengeSession.mockResolvedValue({
      puzzleId: "p1",
      siteId: "s1",
      correctImageIds: ["a", "b", "c", "d"],
      correctCount: 4,
      difficulty: 0.5,
    });

    // 2 correct out of 4 with 0.5 difficulty → need 2, have 2
    const res = await POST(
      makePostRequest({ sessionToken: "tok1", selectedIds: ["a", "b"] }),
    );
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.token).toBe("verify-token-123");
    expect(mockDeleteChallengeSession).toHaveBeenCalledWith("tok1");
    expect(mockCreateVerifiedSession).toHaveBeenCalledWith({
      puzzleId: "p1",
      siteId: "s1",
    });
  });

  it("requires all correct images at difficulty 1.0", async () => {
    mockGetChallengeSession.mockResolvedValue({
      puzzleId: "p1",
      siteId: "s1",
      correctImageIds: ["a", "b", "c"],
      correctCount: 3,
      difficulty: 1.0,
    });

    // Only 2 of 3 correct with difficulty 1.0 → need 3
    const res = await POST(
      makePostRequest({ sessionToken: "tok1", selectedIds: ["a", "b"] }),
    );
    const data = await res.json();
    expect(data.success).toBe(false);
  });
});
