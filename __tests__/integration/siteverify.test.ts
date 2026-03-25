import { beforeEach, describe, expect, it, vi } from "vitest";
import { chainResult, makePostRequest } from "../helpers";

const mockDb = {
	select: vi.fn(),
};
vi.mocked(await import("@/lib/db")).db =
	mockDb as unknown as typeof import("@/lib/db").db;

// Mock captcha-session module
const mockConsumeVerifiedSession = vi.fn();
vi.mock("@/lib/captcha-session", () => ({
	consumeVerifiedSession: (...args: unknown[]) =>
		mockConsumeVerifiedSession(...args),
}));

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
		mockConsumeVerifiedSession.mockResolvedValue(null);

		const res = await POST(
			makePostRequest({ token: "bad", secretKey: "sk_test" }),
		);
		const data = await res.json();
		expect(data.success).toBe(false);
		expect(data.error).toBe("Invalid token");
	});

	it("returns success: false for wrong secretKey", async () => {
		mockConsumeVerifiedSession.mockResolvedValue({
			puzzleId: "p1",
			siteId: "s1",
		});

		// owner check fails
		mockDb.select.mockReturnValueOnce(chainResult([]));

		const res = await POST(
			makePostRequest({ token: "tok1", secretKey: "sk_wrong" }),
		);
		const data = await res.json();
		expect(data.success).toBe(false);
		expect(data.error).toBe("Invalid secretKey");
	});

	it("returns success: true on valid token and secretKey", async () => {
		mockConsumeVerifiedSession.mockResolvedValue({
			puzzleId: "p1",
			siteId: "s1",
		});

		mockDb.select.mockReturnValueOnce(chainResult([{ siteId: "s1" }]));

		const res = await POST(
			makePostRequest({ token: "tok1", secretKey: "sk_test" }),
		);
		const data = await res.json();
		expect(data.success).toBe(true);
		expect(mockConsumeVerifiedSession).toHaveBeenCalledWith("tok1");
	});
});
