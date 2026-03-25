import { describe, expect, it } from "vitest";
import {
	CAPTCHA_GRID_SIZE,
	CAPTCHA_SESSION_TTL_MS,
	DEFAULT_CORRECT_COUNT,
	DIFFICULTY_PRESETS,
} from "@/lib/types";

describe("CAPTCHA constants", () => {
	it("CAPTCHA_GRID_SIZE is 9", () => {
		expect(CAPTCHA_GRID_SIZE).toBe(9);
	});

	it("DEFAULT_CORRECT_COUNT is 3", () => {
		expect(DEFAULT_CORRECT_COUNT).toBe(3);
	});

	it("CAPTCHA_SESSION_TTL_MS is 5 minutes", () => {
		expect(CAPTCHA_SESSION_TTL_MS).toBe(300_000);
	});

	it("DIFFICULTY_PRESETS has 3 entries with correct values", () => {
		expect(DIFFICULTY_PRESETS).toHaveLength(3);
		expect(DIFFICULTY_PRESETS[0]).toEqual({ label: "Easy", value: 0.25 });
		expect(DIFFICULTY_PRESETS[1]).toEqual({ label: "Medium", value: 0.5 });
		expect(DIFFICULTY_PRESETS[2]).toEqual({ label: "Hard", value: 0.75 });
	});
});
