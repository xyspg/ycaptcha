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
