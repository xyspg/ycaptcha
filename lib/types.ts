export type ActionState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
  values?: Record<string, string>;
} | null;

/** Number of images in the CAPTCHA grid (3x3) */
export const CAPTCHA_GRID_SIZE = 9;

/** Max correct images allowed (grid size - 1, since all-selected = auto fail) */
export const CAPTCHA_MAX_CORRECT = CAPTCHA_GRID_SIZE - 1;

/** Session TTL in milliseconds (5 minutes) */
export const CAPTCHA_SESSION_TTL_MS = 5 * 60 * 1000;

/** Difficulty presets for puzzle configuration */
export const DIFFICULTY_PRESETS = [
  { label: "Easy", value: 0.25 },
  { label: "Medium", value: 0.5 },
  { label: "Hard", value: 0.75 },
] as const;
