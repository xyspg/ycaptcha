import { describe, expect, it } from "vitest";
import { getClientIP, shuffle } from "@/lib/utils";

describe("shuffle()", () => {
	it("returns a new array", () => {
		const original = [1, 2, 3, 4, 5];
		const result = shuffle(original);
		expect(result).not.toBe(original);
	});

	it("preserves length", () => {
		const arr = [1, 2, 3, 4, 5];
		expect(shuffle(arr)).toHaveLength(arr.length);
	});

	it("contains the same elements", () => {
		const arr = [1, 2, 3, 4, 5];
		expect(shuffle(arr).sort()).toEqual(arr.sort());
	});

	it("does not mutate the original array", () => {
		const arr = [1, 2, 3, 4, 5];
		const copy = [...arr];
		shuffle(arr);
		expect(arr).toEqual(copy);
	});

	it("produces varied output over multiple runs", () => {
		const arr = Array.from({ length: 20 }, (_, i) => i);
		const results = new Set(
			Array.from({ length: 10 }, () => shuffle(arr).join(",")),
		);
		// With 20 elements and 10 shuffles, we should get multiple unique orderings
		expect(results.size).toBeGreaterThan(1);
	});
});

describe("getClientIP()", () => {
	it("extracts the first IP from x-forwarded-for", () => {
		const req = new Request("http://localhost", {
			headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
		});
		expect(getClientIP(req)).toBe("1.2.3.4");
	});

	it("normalizes ::1 to 127.0.0.1", () => {
		const req = new Request("http://localhost", {
			headers: { "x-forwarded-for": "::1" },
		});
		expect(getClientIP(req)).toBe("127.0.0.1");
	});

	it("returns 127.0.0.1 when header is missing", () => {
		const req = new Request("http://localhost");
		expect(getClientIP(req)).toBe("127.0.0.1");
	});
});
