import { vi } from "vitest";

// Mock @/lib/env — provide fake values so modules that import env don't crash
vi.mock("@/lib/env", () => ({
	env: {
		DATABASE_URL: "postgresql://test:test@localhost:5432/test",
		BETTER_AUTH_SECRET: "test-secret",
		BETTER_AUTH_URL: "http://localhost:3000",
		GITHUB_CLIENT_ID: "test-gh-id",
		GITHUB_CLIENT_SECRET: "test-gh-secret",
		R2_ACCESS_KEY_ID: "test-r2-key",
		R2_SECRET_ACCESS_KEY: "test-r2-secret",
		R2_BUCKET: "ycaptcha",
		R2_ENDPOINT: "https://fake.r2.cloudflarestorage.com",
		R2_PUBLIC_URL: "https://r2.ycaptcha.xyspg.moe",
		NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
		UPSTASH_REDIS_REST_URL: "https://fake-redis.upstash.io",
		UPSTASH_REDIS_REST_TOKEN: "fake-token",
	},
}));

// Mock @/lib/db — empty default, tests override via vi.mocked()
vi.mock("@/lib/db", () => ({
	db: {},
}));

// Mock @/lib/redis — empty default, tests override via vi.mocked()
vi.mock("@/lib/redis", () => ({
	redis: {
		get: vi.fn(),
		setex: vi.fn(),
		del: vi.fn(),
	},
}));

// Mock rate limiting — always allow in tests
vi.mock("@/lib/rate-limit", () => ({
	rateLimiters: {
		challenge: {},
		verify: {},
		siteverify: {},
		image: {},
		auth: {},
	},
	checkRateLimit: vi.fn().mockResolvedValue(null),
}));

// Mock sharp — not needed in tests
vi.mock("sharp", () => ({
	default: vi.fn(() => ({
		resize: vi.fn().mockReturnThis(),
		webp: vi.fn().mockReturnThis(),
		toBuffer: vi.fn().mockResolvedValue(Buffer.from("fake")),
	})),
}));

// Mock S3 client
vi.mock("@aws-sdk/client-s3", () => {
	return {
		S3Client: class {
			send = vi.fn();
		},
		PutObjectCommand: class {},
		DeleteObjectCommand: class {},
	};
});
