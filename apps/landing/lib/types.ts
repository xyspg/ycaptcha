export type ActionState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
  values?: Record<string, string>;
} | null;

/** Number of images in the CAPTCHA grid (3x3) */
export const CAPTCHA_GRID_SIZE = 9;

/** Default number of correct images shown per challenge */
export const DEFAULT_CORRECT_COUNT = 3;

/** Session TTL in milliseconds (5 minutes) */
export const CAPTCHA_SESSION_TTL_MS = 5 * 60 * 1000;

/** Session TTL in seconds for Redis */
export const CAPTCHA_SESSION_TTL_S = CAPTCHA_SESSION_TTL_MS / 1000;

/** Difficulty presets for puzzle configuration */
export const DIFFICULTY_PRESETS = [
  { label: "Easy", value: 0.25 },
  { label: "Medium", value: 0.5 },
  { label: "Hard", value: 0.75 },
] as const;

/** Verification modes available per puzzle */
export const CAPTCHA_MODES = ["image", "audio", "combined"] as const;
export type CaptchaMode = (typeof CAPTCHA_MODES)[number];
