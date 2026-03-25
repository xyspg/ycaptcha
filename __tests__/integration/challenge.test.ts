import { beforeEach, describe, expect, it, vi } from "vitest";
import { chainResult, makePostRequest } from "../helpers";

// We need to mock db before importing the route
const mockDb = {
	select: vi.fn(),
};
vi.mocked(await import("@/lib/db")).db =
	mockDb as unknown as typeof import("@/lib/db").db;

// Mock captcha-session module
const mockCreateChallengeSession = vi
	.fn()
	.mockResolvedValue("session-token-123");
vi.mock("@/lib/captcha-session", () => ({
	createChallengeSession: (...args: unknown[]) =>
		mockCreateChallengeSession(...args),
}));

const { POST } = await import("@/app/api/v0/captcha/challenge/route");

beforeEach(() => {
	vi.clearAllMocks();
	mockCreateChallengeSession.mockResolvedValue("session-token-123");
});

describe("POST /api/v0/captcha/challenge", () => {
	it("returns 400 when siteKey is missing", async () => {
		const res = await POST(makePostRequest({}));
		expect(res.status).toBe(400);
		expect(await res.json()).toMatchObject({ error: "Missing siteKey" });
	});

	it("returns 404 for invalid siteKey", async () => {
		mockDb.select.mockReturnValue(chainResult([]));

		const res = await POST(makePostRequest({ siteKey: "pk_invalid" }));
		expect(res.status).toBe(404);
		expect(await res.json()).toMatchObject({ error: "Invalid siteKey" });
	});

	it("returns 403 when origin domain does not match", async () => {
		mockDb.select.mockReturnValueOnce(
			chainResult([{ id: "s1", siteKey: "pk_test", domain: "example.com" }]),
		);

		const res = await POST(
			makePostRequest({ siteKey: "pk_test", origin: "https://evil.com" }),
		);
		expect(res.status).toBe(403);
	});

	it("returns 400 for malformed origin", async () => {
		mockDb.select.mockReturnValueOnce(
			chainResult([{ id: "s1", siteKey: "pk_test", domain: "example.com" }]),
		);

		const res = await POST(
			makePostRequest({ siteKey: "pk_test", origin: "not-a-url" }),
		);
		expect(res.status).toBe(400);
		expect(await res.json()).toMatchObject({ error: "Invalid origin" });
	});

	it("returns 400 when origin is missing and site has domain", async () => {
		mockDb.select.mockReturnValueOnce(
			chainResult([{ id: "s1", siteKey: "pk_test", domain: "example.com" }]),
		);

		const res = await POST(makePostRequest({ siteKey: "pk_test" }));
		expect(res.status).toBe(400);
		expect(await res.json()).toMatchObject({ error: "Missing origin" });
	});

	it("returns 404 when no puzzles configured", async () => {
		mockDb.select
			.mockReturnValueOnce(
				chainResult([{ id: "s1", siteKey: "pk_test", domain: "example.com" }]),
			)
			.mockReturnValueOnce(chainResult([])); // no puzzles

		const res = await POST(
			makePostRequest({ siteKey: "pk_test", origin: "https://example.com" }),
		);
		expect(res.status).toBe(404);
		expect(await res.json()).toMatchObject({
			error: "No puzzles configured for this site",
		});
	});

	it("returns session token, prompt, and 9 images on success", async () => {
		const correctIds = ["img1", "img2", "img3"];
		const correctImages = correctIds.map((id) => ({
			id,
			url: `https://r2.ycaptcha.xyspg.moe/images/${id}.webp`,
		}));
		const incorrectImages = Array.from({ length: 6 }, (_, i) => ({
			id: `inc${i}`,
			url: `https://r2.ycaptcha.xyspg.moe/images/inc${i}.webp`,
		}));

		mockDb.select
			// site lookup
			.mockReturnValueOnce(
				chainResult([{ id: "s1", siteKey: "pk_test", domain: null }]),
			)
			// puzzle lookup
			.mockReturnValueOnce(
				chainResult([
					{
						id: "p1",
						siteId: "s1",
						imageSetId: "is1",
						correctImageIds: correctIds,
						incorrectImageIds: null,
						correctCount: 3,
						correctCountMax: null,
						enabled: true,
						prompt: "Select cats",
						difficulty: 0.5,
					},
				]),
			)
			// correct images
			.mockReturnValueOnce(chainResult(correctImages))
			// incorrect images
			.mockReturnValueOnce(chainResult(incorrectImages));

		const res = await POST(makePostRequest({ siteKey: "pk_test" }));
		expect(res.status).toBe(200);

		const data = await res.json();
		expect(data.sessionToken).toBe("session-token-123");
		expect(data.prompt).toBe("Select cats");
		expect(data.images).toHaveLength(9);
		// Images should only contain url (no id exposed to client)
		expect(data.images[0]).toHaveProperty("url");
		expect(data.images[0]).not.toHaveProperty("id");

		// Verify createChallengeSession was called with correct data
		expect(mockCreateChallengeSession).toHaveBeenCalledOnce();
		const sessionData = mockCreateChallengeSession.mock.calls[0][0];
		expect(sessionData.puzzleId).toBe("p1");
		expect(sessionData.siteId).toBe("s1");
		// correctImageIds should be the displayed subset, not the full pool
		expect(sessionData.correctImageIds).toHaveLength(3);
		sessionData.correctImageIds.forEach((id: string) => {
			expect(correctIds).toContain(id);
		});
	});
});
