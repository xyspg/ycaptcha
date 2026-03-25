import { describe, expect, it } from "vitest";
import { r2KeyFromUrl } from "@/lib/r2";

describe("r2KeyFromUrl()", () => {
	it("extracts key from public URL", () => {
		expect(r2KeyFromUrl("https://r2.ycaptcha.xyspg.moe/images/abc.webp")).toBe(
			"images/abc.webp",
		);
	});

	it("falls back to URL pathname for non-matching prefix", () => {
		expect(r2KeyFromUrl("https://other-cdn.example.com/images/xyz.webp")).toBe(
			"images/xyz.webp",
		);
	});

	it("handles nested paths", () => {
		expect(
			r2KeyFromUrl(
				"https://r2.ycaptcha.xyspg.moe/images/nested/deep/file.webp",
			),
		).toBe("images/nested/deep/file.webp");
	});
});
