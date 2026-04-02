import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	getCorrectIndices,
	mockR2Fetch,
	postRequest,
	restoreFetch,
} from "./helpers";
import { cleanup, seed, TEST_SECRET_KEY, TEST_SITE_KEY } from "./seed";

const challengePOST = (await import("@/app/(main)/api/v0/captcha/challenge/route"))
	.POST;
const verifyPOST = (await import("@/app/(main)/api/v0/captcha/verify/route")).POST;
const siteverifyPOST = (await import("@/app/(main)/api/v0/captcha/siteverify/route"))
	.POST;
const imageGET = (
	await import("@/app/(main)/api/v0/captcha/image/[sessionToken]/[index]/route")
).GET;

beforeAll(async () => {
	await seed();
});

afterAll(async () => {
	restoreFetch();
	await cleanup();
}, 30_000);

describe("Complete CAPTCHA lifecycle — real DB + Redis", () => {
	it("challenge → load images → verify → siteverify", async () => {
		// ── Step 1: Get a challenge ──
		const challengeRes = await challengePOST(
			postRequest({ siteKey: TEST_SITE_KEY, origin: "https://example.com" }),
		);
		expect(challengeRes.status).toBe(200);

		const challengeData = await challengeRes.json();
		expect(challengeData.sessionToken).toBeDefined();
		expect(challengeData.prompt).toBe("Select all test images");
		expect(challengeData.images).toHaveLength(9);

		const { sessionToken } = challengeData;

		// ── Step 2: Load all 9 images via proxy ──
		mockR2Fetch();

		for (let i = 0; i < 9; i++) {
			const imgRes = await imageGET(
				new Request(
					`http://localhost:3000/api/v0/captcha/image/${sessionToken}/${i}`,
				),
				{ params: Promise.resolve({ sessionToken, index: String(i) }) },
			);
			expect(imgRes.status).toBe(200);
			expect(imgRes.headers.get("Content-Type")).toBe("image/webp");
		}

		restoreFetch();

		// ── Step 3: Verify with correct answers ──
		const correctIndices = await getCorrectIndices(sessionToken);
		expect(correctIndices.length).toBeGreaterThanOrEqual(3);

		const verifyRes = await verifyPOST(
			postRequest({ sessionToken, selectedIndices: correctIndices }),
		);
		expect(verifyRes.status).toBe(200);

		const verifyData = await verifyRes.json();
		expect(verifyData.success).toBe(true);
		expect(verifyData.token).toBeDefined();

		const { token: verificationToken } = verifyData;

		// ── Step 4: Site-verify with the secret key ──
		const siteverifyRes = await siteverifyPOST(
			postRequest({
				token: verificationToken,
				secretKey: TEST_SECRET_KEY,
			}),
		);
		expect(siteverifyRes.status).toBe(200);

		const siteverifyData = await siteverifyRes.json();
		expect(siteverifyData.success).toBe(true);

		// ── Step 5: Verify token is consumed (cannot reuse) ──
		const replayRes = await siteverifyPOST(
			postRequest({
				token: verificationToken,
				secretKey: TEST_SECRET_KEY,
			}),
		);
		const replayData = await replayRes.json();
		expect(replayData.success).toBe(false);
	});
});
