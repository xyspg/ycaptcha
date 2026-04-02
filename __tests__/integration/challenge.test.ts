import { beforeAll, describe, expect, it } from "vitest";
import { getChallenge, postRequest } from "./helpers";
import { seed, TEST_SITE_KEY } from "./seed";

const { POST } = await import("@/app/(main)/api/v0/captcha/challenge/route");

beforeAll(async () => {
	await seed();
});

describe("POST /api/v0/captcha/challenge — real DB + Redis", () => {
	it("returns 200 with sessionToken, prompt, and 9 images", async () => {
		const res = await POST(
			postRequest({ siteKey: TEST_SITE_KEY, origin: "https://example.com" }),
		);
		expect(res.status).toBe(200);

		const data = await res.json();
		expect(data.sessionToken).toBeDefined();
		expect(typeof data.sessionToken).toBe("string");
		expect(data.prompt).toBe("Select all test images");
		expect(data.images).toHaveLength(9);

		// Images expose only proxy URLs, no IDs
		for (const img of data.images) {
			expect(img).toHaveProperty("url");
			expect(img).not.toHaveProperty("id");
			expect(img.url).toMatch(/^\/api\/v0\/captcha\/image\//);
		}
	});

	it("returns 404 for invalid siteKey", async () => {
		const res = await POST(postRequest({ siteKey: "pk_does_not_exist" }));
		expect(res.status).toBe(404);
		expect(await res.json()).toMatchObject({ error: "Invalid siteKey" });
	});

	it("returns 400 for missing siteKey", async () => {
		const res = await POST(postRequest({}));
		expect(res.status).toBe(400);
		expect(await res.json()).toMatchObject({ error: "Missing siteKey" });
	});

	it("only picks enabled puzzles (disabled puzzle is excluded)", async () => {
		// The test site has 1 enabled puzzle and 1 disabled — 2 requests is sufficient
		const results = await Promise.all([
			getChallenge(TEST_SITE_KEY, "https://example.com"),
			getChallenge(TEST_SITE_KEY, "https://example.com"),
		]);

		for (const data of results) {
			expect(data.prompt).toBe("Select all test images");
		}
	});

	it("rate limiting enforces limits against real Redis", async () => {
		const { Ratelimit } = await import("@upstash/ratelimit");
		const { redis } = await import("@/lib/redis");

		// Use a unique identifier per test run to avoid stale rate limit state
		const uniqueId = `test-ip-${Date.now()}-${Math.random().toString(36).slice(2)}`;

		const limiter = new Ratelimit({
			redis,
			limiter: Ratelimit.slidingWindow(5, "60 s"),
			prefix: "rl:integration-test",
		});

		const results: boolean[] = [];
		for (let i = 0; i < 10; i++) {
			const { success } = await limiter.limit(uniqueId);
			results.push(success);
		}

		const allowed = results.filter(Boolean).length;
		const denied = results.filter((r) => !r).length;

		// Sliding window is approximate — allow ±1
		expect(allowed).toBeGreaterThanOrEqual(4);
		expect(allowed).toBeLessThanOrEqual(6);
		expect(denied).toBeGreaterThan(0);
	});
});
