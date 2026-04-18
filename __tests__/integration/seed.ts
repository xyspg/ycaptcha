import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { audio, image, imageSet, puzzle, site } from "@/lib/db/app-schema";
import { user } from "@/lib/db/schema";

// ── Fixed test IDs ──────────────────────────────────────────────────

export const TEST_USER_ID = "test-user-integration";

export const TEST_SITE_ID = "test-site-integration";
export const TEST_SITE_KEY = "pk_test_integration_key_12345678";
export const TEST_SECRET_KEY = "sk_test_integration_key_12345678";

export const TEST_HARD_SITE_ID = "test-site-hard";
export const TEST_HARD_SITE_KEY = "pk_test_hard_key_123456789012";
export const TEST_HARD_SECRET_KEY = "sk_test_hard_key_123456789012";

export const TEST_IMAGE_SET_ID = "test-imageset-integration";
export const TEST_PUZZLE_ID = "test-puzzle-integration";
export const TEST_DISABLED_PUZZLE_ID = "test-puzzle-disabled";
export const TEST_HARD_PUZZLE_ID = "test-puzzle-hard";

// Audio fixtures — used for audio-only and combined puzzle modes.
export const TEST_AUDIO_ID = "test-audio-integration";
export const TEST_AUDIO_URL =
  "https://r2.ycaptcha.xyspg.moe/audio/test-fixture.wav";
export const TEST_AUDIO_ANSWER = "RainBow";

// Dedicated sites per mode so the random puzzle pick in the challenge
// route deterministically returns the puzzle we're testing.
export const TEST_AUDIO_SITE_ID = "test-site-audio";
export const TEST_AUDIO_SITE_KEY = "pk_test_audio_key_12345678901";
export const TEST_AUDIO_SECRET_KEY = "sk_test_audio_key_12345678901";

export const TEST_COMBINED_SITE_ID = "test-site-combined";
export const TEST_COMBINED_SITE_KEY = "pk_test_combined_key_1234567890";
export const TEST_COMBINED_SECRET_KEY = "sk_test_combined_key_1234567890";

export const TEST_AUDIO_PUZZLE_ID = "test-puzzle-audio-only";
export const TEST_COMBINED_PUZZLE_ID = "test-puzzle-combined";

export const TEST_IMAGE_IDS = Array.from(
  { length: 15 },
  (_, i) => `test-img-${i}`,
);
/** First 5 images are correct */
export const TEST_CORRECT_IDS = TEST_IMAGE_IDS.slice(0, 5);
/** Next 6 images are incorrect */
export const TEST_INCORRECT_IDS = TEST_IMAGE_IDS.slice(5, 11);

// ── Seed & cleanup ─────────────────────────────────────────────────

let seeded = false;

export async function seed() {
  if (seeded) return;

  await db
    .insert(user)
    .values({
      id: TEST_USER_ID,
      name: "Test User",
      email: "test-integration@ycaptcha.test",
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  await Promise.all([
    db
      .insert(site)
      .values([
        {
          id: TEST_SITE_ID,
          userId: TEST_USER_ID,
          name: "Test Site",
          domain: "example.com",
          siteKey: TEST_SITE_KEY,
          secretKey: TEST_SECRET_KEY,
        },
        {
          id: TEST_HARD_SITE_ID,
          userId: TEST_USER_ID,
          name: "Test Hard Site",
          domain: null, // no domain check
          siteKey: TEST_HARD_SITE_KEY,
          secretKey: TEST_HARD_SECRET_KEY,
        },
        {
          id: TEST_AUDIO_SITE_ID,
          userId: TEST_USER_ID,
          name: "Test Audio Site",
          domain: null,
          siteKey: TEST_AUDIO_SITE_KEY,
          secretKey: TEST_AUDIO_SECRET_KEY,
        },
        {
          id: TEST_COMBINED_SITE_ID,
          userId: TEST_USER_ID,
          name: "Test Combined Site",
          domain: null,
          siteKey: TEST_COMBINED_SITE_KEY,
          secretKey: TEST_COMBINED_SECRET_KEY,
        },
      ])
      .onConflictDoNothing(),
    db
      .insert(imageSet)
      .values({
        id: TEST_IMAGE_SET_ID,
        userId: TEST_USER_ID,
        name: "Test Image Set",
      })
      .onConflictDoNothing(),
    db
      .insert(audio)
      .values({
        id: TEST_AUDIO_ID,
        userId: TEST_USER_ID,
        url: TEST_AUDIO_URL,
        name: "test-audio",
        durationMs: 1000,
        contentHash: "test-audio-hash",
        sizeBytes: 44_100, // ~1s of mono 22kHz 16-bit WAV
      })
      .onConflictDoNothing(),
  ]);

  await db
    .insert(image)
    .values(
      TEST_IMAGE_IDS.map((id, i) => ({
        id,
        imageSetId: TEST_IMAGE_SET_ID,
        url: `https://r2.ycaptcha.xyspg.moe/images/test-${i}.webp`,
        name: `test-image-${i}`,
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(puzzle)
    .values([
      {
        id: TEST_PUZZLE_ID,
        siteId: TEST_SITE_ID,
        imageSetId: TEST_IMAGE_SET_ID,
        prompt: "Select all test images",
        correctImageIds: TEST_CORRECT_IDS,
        incorrectImageIds: TEST_INCORRECT_IDS,
        correctCount: 3,
        correctCountMax: null,
        difficulty: 0.5,
        enabled: true,
        captchaMode: "image",
      },
      {
        id: TEST_DISABLED_PUZZLE_ID,
        siteId: TEST_SITE_ID,
        imageSetId: TEST_IMAGE_SET_ID,
        prompt: "Disabled puzzle",
        correctImageIds: TEST_CORRECT_IDS,
        incorrectImageIds: TEST_INCORRECT_IDS,
        correctCount: 3,
        difficulty: 0.5,
        enabled: false,
        captchaMode: "image",
      },
      {
        id: TEST_HARD_PUZZLE_ID,
        siteId: TEST_HARD_SITE_ID,
        imageSetId: TEST_IMAGE_SET_ID,
        prompt: "Hard puzzle",
        correctImageIds: TEST_CORRECT_IDS,
        incorrectImageIds: TEST_INCORRECT_IDS,
        correctCount: 3,
        difficulty: 1.0,
        enabled: true,
        captchaMode: "image",
      },
      {
        id: TEST_AUDIO_PUZZLE_ID,
        siteId: TEST_AUDIO_SITE_ID,
        imageSetId: null,
        prompt: "Type what you hear",
        correctImageIds: [],
        correctCount: 1,
        difficulty: 0.5,
        enabled: true,
        captchaMode: "audio",
        audioId: TEST_AUDIO_ID,
        audioAnswer: TEST_AUDIO_ANSWER,
      },
      {
        id: TEST_COMBINED_PUZZLE_ID,
        siteId: TEST_COMBINED_SITE_ID,
        imageSetId: TEST_IMAGE_SET_ID,
        prompt: "Select test images or type the audio",
        correctImageIds: TEST_CORRECT_IDS,
        incorrectImageIds: TEST_INCORRECT_IDS,
        correctCount: 3,
        difficulty: 0.5,
        enabled: true,
        captchaMode: "combined",
        audioId: TEST_AUDIO_ID,
        audioAnswer: TEST_AUDIO_ANSWER,
      },
    ])
    .onConflictDoNothing();

  seeded = true;
}

export async function cleanup() {
  // Must delete puzzles first: puzzle.imageSetId has onDelete:"restrict",
  // so cascading user → imageSet would fail if puzzles still exist.
  await db
    .delete(puzzle)
    .where(
      inArray(
        puzzle.siteId,
        db
          .select({ id: site.id })
          .from(site)
          .where(eq(site.userId, TEST_USER_ID)),
      ),
    )
    .catch(() => {});

  await db
    .delete(user)
    .where(eq(user.id, TEST_USER_ID))
    .catch(() => {});
  seeded = false;

  // Redis captcha keys auto-expire (5 min TTL), no explicit cleanup needed
}
