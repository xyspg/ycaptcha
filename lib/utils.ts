import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extract client IP address from request.
 * On Vercel, x-forwarded-for is always set by the edge proxy.
 * The ::1 normalization and 127.0.0.1 fallback handle local dev.
 */
export function getClientIP(request: Request): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return !ip || ip === "::1" ? "127.0.0.1" : ip
}

/** Fisher-Yates shuffle. Returns a new array. */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
