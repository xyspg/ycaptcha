import { beforeEach, describe, expect, it, vi } from "vitest";
import { makePostRequest } from "../helpers";

// Mock captcha-session module
const mockConsumeChallengeSession = vi.fn();
const mockCreateVerifiedSession = vi.fn().mockResolvedValue("verify-token-123");
vi.mock("@/lib/captcha-session", () => ({
	consumeChallengeSession: (...args: unknown[]) =>
		mockConsumeChallengeSession(...args),
	createVerifiedSession: (...args: unknown[]) =>
		mockCreateVerifiedSession(...args),
}));

const { POST } = await import("@/app/api/v0/captcha/verify/route");

beforeEach(() => {
	vi.clearAllMocks();
	mockCreateVerifiedSession.mockResolvedValue("verify-token-123");
});

// Helper: build a mock session with imageIds grid
function mockSession(opts: {
	correctImageIds: string[];
	correctCount: number;
	difficulty: number;
	imageIds?: string[];
}) {
	return {
		puzzleId: "p1",
		siteId: "s1",
		imageIds: opts.imageIds ?? ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
		correctImageIds: opts.correctImageIds,
		correctCount: opts.correctCount,
		difficulty: opts.difficulty,
	};
}

describe("POST /api/v0/captcha/verify", () => {
	it("returns 400 when params are missing", async () => {
		const res = await POST(makePostRequest({}));
		expect(res.status).toBe(400);
	});

	it("returns 400 for invalid/expired session", async () => {
		mockConsumeChallengeSession.mockResolvedValue(null);

		const res = await POST(
			makePostRequest({ sessionToken: "bad", selectedIndices: [0] }),
		);
		expect(res.status).toBe(400);
		expect(await res.json()).toMatchObject({ success: false });
	});

	it("returns 400 for out-of-range indices", async () => {
		const res = await POST(
			makePostRequest({ sessionToken: "tok1", selectedIndices: [9] }),
		);
		expect(res.status).toBe(400);
		expect(await res.json()).toMatchObject({ error: "Invalid indices" });
	});

	it("returns success: false when all 9 images selected (anti-bot)", async () => {
		mockConsumeChallengeSession.mockResolvedValue(
			mockSession({
				correctImageIds: ["a", "b"],
				correctCount: 2,
				difficulty: 0.5,
			}),
		);

		const allNine = Array.from({ length: 9 }, (_, i) => i);
		const res = await POST(
			makePostRequest({ sessionToken: "tok1", selectedIndices: allNine }),
		);
		const data = await res.json();
		expect(data.success).toBe(false);
	});

	it("returns success: false with insufficient correct selections", async () => {
		// imageIds: [a, b, c, d, e, f, g, h, i], correctImageIds: [a, b, c, d]
		// correctCount 4, difficulty 0.5 → need ceil(4*0.5)=2 correct
		mockConsumeChallengeSession.mockResolvedValue(
			mockSession({
				correctImageIds: ["a", "b", "c", "d"],
				correctCount: 4,
				difficulty: 0.5,
			}),
		);

		// Select index 0 (a=correct) + index 4 (e=wrong) → only 1 correct, need 2
		const res = await POST(
			makePostRequest({ sessionToken: "tok1", selectedIndices: [0, 4] }),
		);
		const data = await res.json();
		expect(data.success).toBe(false);
	});

	it("returns success: true with sufficient correct selections", async () => {
		mockConsumeChallengeSession.mockResolvedValue(
			mockSession({
				correctImageIds: ["a", "b", "c", "d"],
				correctCount: 4,
				difficulty: 0.5,
			}),
		);

		// Select indices 0, 1 → imageIds a, b → 2 correct, need ceil(4*0.5)=2
		const res = await POST(
			makePostRequest({ sessionToken: "tok1", selectedIndices: [0, 1] }),
		);
		const data = await res.json();
		expect(data.success).toBe(true);
		expect(data.token).toBe("verify-token-123");
		expect(mockConsumeChallengeSession).toHaveBeenCalledWith("tok1");
		expect(mockCreateVerifiedSession).toHaveBeenCalledWith({
			puzzleId: "p1",
			siteId: "s1",
		});
	});

	it("requires all correct images at difficulty 1.0", async () => {
		mockConsumeChallengeSession.mockResolvedValue(
			mockSession({
				correctImageIds: ["a", "b", "c"],
				correctCount: 3,
				difficulty: 1.0,
			}),
		);

		// Only 2 of 3 correct with difficulty 1.0 → need 3
		const res = await POST(
			makePostRequest({ sessionToken: "tok1", selectedIndices: [0, 1] }),
		);
		const data = await res.json();
		expect(data.success).toBe(false);
	});
});
