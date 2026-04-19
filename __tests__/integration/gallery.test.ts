import { createHash } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const sessionState = vi.hoisted(() => ({
  userId: "",
  userName: "Test User",
  userEmail: "test@ycaptcha.test",
}));

const r2State = vi.hoisted(() => ({
  deletedKeys: [] as string[],
}));

vi.mock("@/lib/auth/session", () => ({
  requireSession: vi.fn(async () => ({
    session: {
      id: "test-session",
      userId: sessionState.userId,
      token: "test-token",
      expiresAt: new Date(Date.now() + 86_400_000),
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: null,
      userAgent: null,
    },
    user: {
      id: sessionState.userId,
      name: sessionState.userName,
      email: sessionState.userEmail,
      emailVerified: false,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })),
  getSession: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    const err = new Error("NEXT_REDIRECT") as Error & { digest: string };
    err.digest = `NEXT_REDIRECT;replace;${path};303;`;
    throw err;
  }),
}));

vi.mock("@/lib/r2", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/r2")>();
  // Mock both `deleteFromR2` (direct callers: deleteImage, deleteImageSet,
  // cleanupUserOnDelete) AND `cleanupR2Keys` (used by deleteGalleryItem).
  // The latter calls `deleteFromR2` via module-closure, which bypasses
  // our module-level mock — so intercepting both is required.
  return {
    ...actual,
    deleteFromR2: vi.fn(async (key: string) => {
      r2State.deletedKeys.push(key);
    }),
    cleanupR2Keys: vi.fn(
      async (keys: ReadonlyArray<string | null | undefined>) => {
        for (const k of keys) if (k) r2State.deletedKeys.push(k);
      },
    ),
  };
});

import {
  deleteGalleryItem,
  forkGalleryItem,
  publishGalleryItem,
} from "@/app/(main)/(gallery)/actions";
import {
  deleteImage,
  deleteImageSet,
} from "@/app/(main)/dashboard/image-sets/actions";
import { cleanupUserOnDelete } from "@/lib/auth/cleanup";
import { db } from "@/lib/db";
import { audio, galleryItem, image, imageSet } from "@/lib/db/app-schema";
import { user } from "@/lib/db/schema";
import { computeSetHash } from "@/lib/gallery-hash";

const R2_PREFIX = "https://r2.ycaptcha.xyspg.moe/";

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/** Content-hash helper — prefixes with RUN_ID so hashes are run-unique. */
function h(content: string): string {
  return sha256(`${RUN_ID}-${content}`);
}

function makeFormData(fields: Record<string, string | undefined>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) fd.append(k, v);
  }
  return fd;
}

/** Log the user in for the actions' `requireSession()` call. */
function actingAs(userId: string, name = "Test User") {
  sessionState.userId = userId;
  sessionState.userName = name;
  sessionState.userEmail = `${userId}@ycaptcha.test`;
}

/**
 * Server actions call `redirect()` on success, which our mock throws
 * as NEXT_REDIRECT. Returns the redirected path; rethrows everything else.
 */
async function catchRedirect(
  promise: Promise<unknown>,
): Promise<{ path: string }> {
  try {
    await promise;
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      const digest = (err as { digest: string }).digest;
      const [, , path] = digest.split(";");
      return { path };
    }
    throw err;
  }
  throw new Error("Expected redirect, got no throw");
}

/** Run a redirect-throwing action and swallow the NEXT_REDIRECT; rethrow others. */
async function ignoreRedirect(promise: Promise<unknown>): Promise<void> {
  try {
    await promise;
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") return;
    throw err;
  }
}

/**
 * Per-run token mixed into every `hashBase` so content-hashes (and therefore
 * gallery_item.imagesHash) are unique across test runs. Without this, a
 * failed run leaves gallery_item rows whose authorId FK gets NULLed — they
 * never cascade-delete and the next run's publish collides on the
 * `gallery_item_images_hash_unique` constraint.
 */
const RUN_ID = nanoid(8);

/** Track users created by tests so `afterAll` can cascade-delete them. */
const testUserIds = new Set<string>();

async function createTestUser(label = "gal"): Promise<string> {
  const id = `test-${label}-${nanoid(10)}`;
  await db.insert(user).values({
    id,
    email: `${id}@ycaptcha.test`,
    name: `Test ${label}`,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  testUserIds.add(id);
  return id;
}

/**
 * Create an imageSet + `count` image rows. `hashBase` lets callers force
 * hash overlap across users (for dedup tests) or keep them distinct.
 */
async function makeImageSet(
  userId: string,
  opts: { count?: number; hashBase?: string; name?: string } = {},
): Promise<{
  setId: string;
  imageIds: string[];
  urls: string[];
  hashes: string[];
  keys: string[];
}> {
  const count = opts.count ?? 9;
  const hashBase = opts.hashBase ?? `u-${userId}`;
  const [set] = await db
    .insert(imageSet)
    .values({ userId, name: opts.name ?? `Set ${nanoid(4)}` })
    .returning({ id: imageSet.id });

  const seeds = Array.from({ length: count }, (_, i) => {
    const hash = h(`${hashBase}-${i}`);
    const key = `images/${nanoid()}.webp`;
    return { hash, key, url: `${R2_PREFIX}${key}`, name: `img-${i}` };
  });
  const rows = await db
    .insert(image)
    .values(
      seeds.map((s) => ({
        imageSetId: set.id,
        url: s.url,
        name: s.name,
        contentHash: s.hash,
        sizeBytes: 1024,
      })),
    )
    .returning({ id: image.id });
  return {
    setId: set.id,
    imageIds: rows.map((r) => r.id),
    urls: seeds.map((s) => s.url),
    hashes: seeds.map((s) => s.hash),
    keys: seeds.map((s) => s.key),
  };
}

async function publish(
  userId: string,
  setId: string,
  extras: Partial<{
    title: string;
    description: string;
    termsAccepted: string;
  }> = {},
) {
  actingAs(userId);
  const fd = makeFormData({
    imageSetId: setId,
    title: extras.title ?? "My gallery item",
    description: extras.description ?? "",
    termsAccepted: extras.termsAccepted ?? "on",
  });
  return publishGalleryItem(null, fd);
}

async function fork(userId: string, slug: string) {
  actingAs(userId);
  return forkGalleryItem(null, makeFormData({ slug }));
}

async function del(userId: string, slug: string) {
  actingAs(userId);
  return deleteGalleryItem(null, makeFormData({ slug }));
}

afterAll(async () => {
  if (testUserIds.size > 0) {
    const ids = [...testUserIds];
    // gallery_item.authorId is `set null` on user delete → rows survive
    // but NULLed. Drop them explicitly before the user cascade to keep the
    // table clean across runs.
    await db
      .delete(galleryItem)
      .where(inArray(galleryItem.authorId, ids))
      .catch(() => {});
    await db
      .delete(user)
      .where(inArray(user.id, ids))
      .catch(() => {});
  }
}, 60_000);

beforeEach(() => {
  r2State.deletedKeys = [];
});

afterEach(() => {
  vi.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════
// publishGalleryItem
// ══════════════════════════════════════════════════════════════════════

describe("publishGalleryItem", () => {
  it("rejects when title is missing", async () => {
    const u = await createTestUser("pub");
    const { setId } = await makeImageSet(u);
    actingAs(u);
    const res = await publishGalleryItem(
      null,
      makeFormData({ imageSetId: setId, termsAccepted: "on" }),
    );
    expect(res?.errors?.title).toBeDefined();
  });

  it("rejects when termsAccepted is not checked", async () => {
    const u = await createTestUser("pub");
    const { setId } = await makeImageSet(u);
    actingAs(u);
    const res = await publishGalleryItem(
      null,
      makeFormData({ imageSetId: setId, title: "x" }),
    );
    expect(res?.errors?.termsAccepted).toBeDefined();
  });

  it("rejects a set with fewer than 9 images", async () => {
    const u = await createTestUser("pub");
    const { setId } = await makeImageSet(u, { count: 8 });
    const res = await publish(u, setId);
    expect(res?.errors?._?.[0]).toMatch(/at least 9/i);
  });

  it("rejects a set with more than 60 images", async () => {
    const u = await createTestUser("pub");
    const { setId } = await makeImageSet(u, { count: 61 });
    const res = await publish(u, setId);
    expect(res?.errors?._?.[0]).toMatch(/capped at 60/i);
  });

  it("rejects a set the caller does not own", async () => {
    const owner = await createTestUser("pub-owner");
    const attacker = await createTestUser("pub-att");
    const { setId } = await makeImageSet(owner);
    const res = await publish(attacker, setId);
    expect(res?.errors?._?.[0]).toMatch(/not found/i);
  });

  it("publishes successfully with valid 9-image set", async () => {
    const u = await createTestUser("pub");
    const { setId, hashes, urls } = await makeImageSet(u);
    const { path } = await catchRedirect(publish(u, setId));
    expect(path).toMatch(/^\/gallery\//);

    const slug = path.split("/").pop() ?? "";
    const [row] = await db
      .select()
      .from(galleryItem)
      .where(eq(galleryItem.slug, slug));
    expect(row).toBeDefined();
    expect(row.authorId).toBe(u);
    expect(row.title).toBe("My gallery item");
    expect(row.status).toBe("published");
    expect(row.images.length).toBe(9);
    expect(row.images.map((i) => i.url).sort()).toEqual([...urls].sort());
    expect(row.imagesHash).toBe(computeSetHash(hashes));
    // Publish path does NOT call R2 — URLs are snapshotted in-place.
    expect(r2State.deletedKeys).toEqual([]);
  });

  it("republishing the exact same content returns a friendly error", async () => {
    const u = await createTestUser("pub");
    const { setId } = await makeImageSet(u);
    await catchRedirect(publish(u, setId));

    // Make a second, identical image set (same content hashes → same imagesHash).
    const sameSet = await makeImageSet(u, {
      hashBase: `u-${u}`, // same hashBase means same hashes
    });
    const res = await publish(u, sameSet.setId);
    expect(res?.errors?._?.[0]).toMatch(/already in the gallery/i);
  });

  it("republishing after modifying one image (new hash) succeeds", async () => {
    const u = await createTestUser("pub");
    const { setId } = await makeImageSet(u);
    await catchRedirect(publish(u, setId));

    // Second set: 8 overlapping hashes + 1 new one → different imagesHash.
    const [newSet] = await db
      .insert(imageSet)
      .values({ userId: u, name: "Modified" })
      .returning({ id: imageSet.id });
    for (let i = 0; i < 8; i++) {
      await db.insert(image).values({
        imageSetId: newSet.id,
        url: `${R2_PREFIX}images/${nanoid()}.webp`,
        name: `img-${i}`,
        contentHash: h(`u-${u}-${i}`),
        sizeBytes: 1024,
      });
    }
    await db.insert(image).values({
      imageSetId: newSet.id,
      url: `${R2_PREFIX}images/${nanoid()}.webp`,
      name: "new-img",
      contentHash: h("brand-new-content"),
      sizeBytes: 1024,
    });

    const { path } = await catchRedirect(publish(u, newSet.id));
    expect(path).toMatch(/^\/gallery\//);
  });

  it("a second user cannot re-publish another user's exact content", async () => {
    const u1 = await createTestUser("pub-a");
    const u2 = await createTestUser("pub-b");
    const { setId: s1 } = await makeImageSet(u1, { hashBase: "shared" });
    await catchRedirect(publish(u1, s1));

    // u2 independently has an imageSet with the same hashes.
    const { setId: s2 } = await makeImageSet(u2, { hashBase: "shared" });
    const res = await publish(u2, s2);
    expect(res?.errors?._?.[0]).toMatch(/already in the gallery/i);
  });

  it("enforces MAX_ITEMS_PER_USER = 10", async () => {
    const u = await createTestUser("pub-max");
    // Create 10 gallery items directly (cheaper than publishing 10 times).
    for (let i = 0; i < 10; i++) {
      await db.insert(galleryItem).values({
        authorId: u,
        authorDisplayName: "Test",
        anonymous: false,
        title: `Item ${i}`,
        description: null,
        images: Array.from({ length: 9 }, (_, j) => ({
          url: `${R2_PREFIX}images/${nanoid()}.webp`,
          name: `n-${j}`,
          contentHash: h(`max-${i}-${j}`),
          sizeBytes: 1024,
        })),
        imagesHash: h(`batch-${i}-${nanoid()}`),
        status: "published",
      });
    }

    const { setId } = await makeImageSet(u, { hashBase: "overflow" });
    const res = await publish(u, setId);
    expect(res?.errors?._?.[0]).toMatch(/limit of 10/i);
  });

  it("skips when any image is missing a contentHash", async () => {
    const u = await createTestUser("pub-nohash");
    const [set] = await db
      .insert(imageSet)
      .values({ userId: u, name: "no-hash set" })
      .returning({ id: imageSet.id });
    for (let i = 0; i < 9; i++) {
      await db.insert(image).values({
        imageSetId: set.id,
        url: `${R2_PREFIX}images/${nanoid()}.webp`,
        name: `img-${i}`,
        contentHash: i === 0 ? null : sha256(`h-${i}`),
        sizeBytes: 1024,
      });
    }
    const res = await publish(u, set.id);
    expect(res?.errors?._?.[0]).toMatch(/content hash/i);
  });

  it("serializes concurrent identical publishes (only one wins)", async () => {
    const u1 = await createTestUser("pub-race");
    const u2 = await createTestUser("pub-race");
    const { setId: s1 } = await makeImageSet(u1, { hashBase: "race" });
    const { setId: s2 } = await makeImageSet(u2, { hashBase: "race" });
    // Two different users, same content → unique-hash conflict must apply.
    const [r1, r2] = await Promise.all([
      publish(u1, s1).catch((e) => e),
      publish(u2, s2).catch((e) => e),
    ]);

    const winners = [r1, r2].filter(
      (r) => r instanceof Error && r.message === "NEXT_REDIRECT",
    );
    const losers = [r1, r2].filter(
      (r) =>
        !(r instanceof Error) &&
        typeof r === "object" &&
        r !== null &&
        "errors" in r,
    ) as Array<{ errors?: { _?: string[] } }>;
    expect(winners.length).toBe(1);
    expect(losers.length).toBe(1);
    expect(losers[0].errors?._?.[0]).toMatch(/already in the gallery/i);
  });
});

// ══════════════════════════════════════════════════════════════════════
// forkGalleryItem
// ══════════════════════════════════════════════════════════════════════

describe("forkGalleryItem", () => {
  async function publishAnd(
    author: string,
    hashBase: string,
  ): Promise<{ slug: string; urls: string[]; hashes: string[] }> {
    const { setId, urls, hashes } = await makeImageSet(author, { hashBase });
    const { path } = await catchRedirect(publish(author, setId));
    const slug = path.split("/").pop()!;
    return { slug, urls, hashes };
  }

  it("forks a published item into a new image set owned by the forker", async () => {
    const u1 = await createTestUser("fork-a");
    const u2 = await createTestUser("fork-b");
    const { slug, urls, hashes } = await publishAnd(u1, `fork-${u1}`);

    const { path } = await catchRedirect(fork(u2, slug));
    expect(path).toMatch(/^\/dashboard\/image-sets\//);
    const newSetId = path.split("/").pop()!;

    const [owned] = await db
      .select()
      .from(imageSet)
      .where(and(eq(imageSet.id, newSetId), eq(imageSet.userId, u2)));
    expect(owned).toBeDefined();

    const rows = await db
      .select()
      .from(image)
      .where(eq(image.imageSetId, newSetId));
    expect(rows.length).toBe(9);
    // URL reuse: forker's rows point at the same R2 objects.
    expect(rows.map((r) => r.url).sort()).toEqual([...urls].sort());
    expect(rows.map((r) => r.contentHash).sort()).toEqual([...hashes].sort());
    // No R2 deletes during fork.
    expect(r2State.deletedKeys).toEqual([]);
  });

  it("increments downloadCount on successful fork", async () => {
    const u1 = await createTestUser("fork-a");
    const u2 = await createTestUser("fork-b");
    const u3 = await createTestUser("fork-c");
    const { slug } = await publishAnd(u1, `fork-${u1}`);

    await catchRedirect(fork(u2, slug));
    await catchRedirect(fork(u3, slug));

    const [gi] = await db
      .select()
      .from(galleryItem)
      .where(eq(galleryItem.slug, slug));
    expect(gi.downloadCount).toBe(2);
  });

  it("refuses to fork when forker already has the exact multiset", async () => {
    const u1 = await createTestUser("fork-a");
    const u2 = await createTestUser("fork-b");
    const { slug } = await publishAnd(u1, `fork-${u1}`);

    // First fork succeeds.
    await catchRedirect(fork(u2, slug));
    // Second fork: forker now has an imageSet with the exact hash multiset.
    const res = await fork(u2, slug);
    expect(res?.errors?._?.[0]).toMatch(/already have/i);
  });

  it("allows fork when forker has overlapping but differently-sized set", async () => {
    const u1 = await createTestUser("fork-a");
    const u2 = await createTestUser("fork-b");
    const { slug } = await publishAnd(u1, `fork-${u1}`);

    // u2 has a set with 8 of the 9 hashes — different length → not "already have".
    const [set] = await db
      .insert(imageSet)
      .values({ userId: u2, name: "partial" })
      .returning({ id: imageSet.id });
    for (let i = 0; i < 8; i++) {
      await db.insert(image).values({
        imageSetId: set.id,
        url: `${R2_PREFIX}images/${nanoid()}.webp`,
        name: `img-${i}`,
        contentHash: h(`fork-${u1}-${i}`),
        sizeBytes: 1024,
      });
    }

    const { path } = await catchRedirect(fork(u2, slug));
    expect(path).toMatch(/^\/dashboard\/image-sets\//);
  });

  it("rejects fork when it would exceed storage quota", async () => {
    const u1 = await createTestUser("fork-a");
    const u2 = await createTestUser("fork-b");
    const { slug } = await publishAnd(u1, `fork-${u1}`);

    // Pump u2's audio byte usage right up to the quota.
    await db.insert(audio).values({
      userId: u2,
      url: `${R2_PREFIX}audio/${nanoid()}.wav`,
      name: "huge",
      contentHash: h("huge"),
      sizeBytes: 200 * 1024 * 1024, // STORAGE_QUOTA_BYTES
    });

    const res = await fork(u2, slug);
    expect(res?.errors?._?.[0]).toMatch(/quota/i);
  });

  it("rejects fork for a nonexistent slug", async () => {
    const u2 = await createTestUser("fork-b");
    const res = await fork(u2, "does-not-exist-xyz");
    expect(res?.errors?._?.[0]).toMatch(/not found/i);
  });

  it("rejects fork for an unpublished (hidden) item", async () => {
    const u1 = await createTestUser("fork-a");
    const u2 = await createTestUser("fork-b");
    const { slug } = await publishAnd(u1, `fork-${u1}`);
    await db
      .update(galleryItem)
      .set({ status: "hidden" })
      .where(eq(galleryItem.slug, slug));
    const res = await fork(u2, slug);
    expect(res?.errors?._?.[0]).toMatch(/not found|unpublished/i);
  });
});

// ══════════════════════════════════════════════════════════════════════
// deleteGalleryItem (author-initiated)
// ══════════════════════════════════════════════════════════════════════

describe("deleteGalleryItem", () => {
  it("deletes the item and purges R2 when nothing else references it", async () => {
    const u = await createTestUser("del");
    const { setId, keys } = await makeImageSet(u, { hashBase: "orphan" });
    const { path } = await catchRedirect(publish(u, setId));
    const slug = path.split("/").pop()!;

    // Delete the source imageSet first so the only reference is the gallery row.
    actingAs(u);
    await ignoreRedirect(deleteImageSet(null, makeFormData({ setId })));
    r2State.deletedKeys = []; // reset: we care about the gallery delete's effect

    const res = await del(u, slug);
    expect(res?.success).toBe(true);
    // All 9 keys should now be purged — no remaining refs.
    expect(r2State.deletedKeys.sort()).toEqual([...keys].sort());

    const [row] = await db
      .select()
      .from(galleryItem)
      .where(eq(galleryItem.slug, slug));
    expect(row).toBeUndefined();
  });

  it("preserves R2 when another user's fork still references the keys", async () => {
    const u1 = await createTestUser("del-a");
    const u2 = await createTestUser("del-b");
    const { setId, keys } = await makeImageSet(u1, { hashBase: `del-${u1}` });
    const { path } = await catchRedirect(publish(u1, setId));
    const slug = path.split("/").pop()!;

    await catchRedirect(fork(u2, slug));
    r2State.deletedKeys = [];

    const res = await del(u1, slug);
    expect(res?.success).toBe(true);
    // All keys still referenced by u2's image rows → nothing deleted.
    expect(r2State.deletedKeys).toEqual([]);
    // And gallery row is gone.
    const [row] = await db
      .select()
      .from(galleryItem)
      .where(eq(galleryItem.slug, slug));
    expect(row).toBeUndefined();
    // u2's image set is untouched.
    const u2Rows = await db
      .select()
      .from(image)
      .innerJoin(imageSet, eq(image.imageSetId, imageSet.id))
      .where(eq(imageSet.userId, u2));
    expect(u2Rows.length).toBe(9);
    expect(u2Rows.map((r) => r.image.url).sort()).toEqual(
      keys.map((k) => `${R2_PREFIX}${k}`).sort(),
    );
  });

  it("preserves R2 when the author's own source imageSet still references keys", async () => {
    const u = await createTestUser("del-self");
    const { setId, keys } = await makeImageSet(u, { hashBase: "selfref" });
    const { path } = await catchRedirect(publish(u, setId));
    const slug = path.split("/").pop()!;
    r2State.deletedKeys = [];

    const res = await del(u, slug);
    expect(res?.success).toBe(true);
    // Source imageSet still has rows → image-refcount wins → nothing deleted.
    expect(r2State.deletedKeys).toEqual([]);

    // Source rows confirmed alive.
    const rows = await db
      .select()
      .from(image)
      .where(eq(image.imageSetId, setId));
    expect(rows.length).toBe(9);
    // Not strictly needed but sanity: URL prefix matches the seeded keys.
    expect(rows.every((r) => keys.some((k) => r.url.endsWith(k)))).toBe(true);
  });

  it("rejects delete from someone who is not the author", async () => {
    const u1 = await createTestUser("del-a");
    const u2 = await createTestUser("del-b");
    const { setId } = await makeImageSet(u1);
    const { path } = await catchRedirect(publish(u1, setId));
    const slug = path.split("/").pop()!;

    const res = await del(u2, slug);
    expect(res?.errors?._?.[0]).toMatch(/not found/i);
    // And the row still exists.
    const [row] = await db
      .select()
      .from(galleryItem)
      .where(eq(galleryItem.slug, slug));
    expect(row).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════════
// deleteImage / deleteImageSet — cross-reference with gallery
// ══════════════════════════════════════════════════════════════════════

describe("deleteImage / deleteImageSet cross-ref with gallery_item", () => {
  it("deleteImage preserves R2 if a gallery_item still references the hash", async () => {
    const u = await createTestUser("dimg");
    const { setId, imageIds, keys } = await makeImageSet(u, {
      hashBase: "dimg",
    });
    await catchRedirect(publish(u, setId));
    r2State.deletedKeys = [];

    // Delete a single image from the source set.
    actingAs(u);
    const res = await deleteImage(
      null,
      makeFormData({ imageId: imageIds[0], setId }),
    );
    expect(res?.success).toBe(true);
    // Gallery snapshot still holds the key → no R2 delete.
    expect(r2State.deletedKeys).toEqual([]);
    // Confirm that key IS among the published snapshot.
    const [gi] = await db
      .select()
      .from(galleryItem)
      .where(eq(galleryItem.authorId, u));
    expect(gi.images.some((img) => img.url.endsWith(keys[0]))).toBe(true);
  });

  it("deleteImageSet preserves R2 when gallery snapshot references the keys", async () => {
    const u = await createTestUser("dset");
    const { setId, keys } = await makeImageSet(u, { hashBase: "dset" });
    await catchRedirect(publish(u, setId));
    r2State.deletedKeys = [];

    actingAs(u);
    // deleteImageSet calls redirect on success — catch it.
    await ignoreRedirect(deleteImageSet(null, makeFormData({ setId })));
    expect(r2State.deletedKeys).toEqual([]);

    // imageSet and its images are gone; gallery_item still holds snapshots.
    const setRows = await db
      .select()
      .from(imageSet)
      .where(eq(imageSet.id, setId));
    expect(setRows.length).toBe(0);
    const [gi] = await db
      .select()
      .from(galleryItem)
      .where(eq(galleryItem.authorId, u));
    expect(gi.images.map((i) => i.url).sort()).toEqual(
      keys.map((k) => `${R2_PREFIX}${k}`).sort(),
    );
  });
});

// ══════════════════════════════════════════════════════════════════════
// Cross-user lifecycle — the scenarios the user asked for explicitly
// ══════════════════════════════════════════════════════════════════════

describe("Cross-user lifecycle", () => {
  it("U1 publish → U2 fork → U1 deletes gallery item → U2 keeps everything", async () => {
    const u1 = await createTestUser("xu-a");
    const u2 = await createTestUser("xu-b");
    const { setId, keys } = await makeImageSet(u1, { hashBase: `xu-${u1}` });
    const { path } = await catchRedirect(publish(u1, setId));
    const slug = path.split("/").pop()!;
    await catchRedirect(fork(u2, slug));
    r2State.deletedKeys = [];

    await del(u1, slug);
    // U2's image rows are the remaining refs → no R2 delete.
    expect(r2State.deletedKeys).toEqual([]);

    const u2Images = await db
      .select()
      .from(image)
      .innerJoin(imageSet, eq(image.imageSetId, imageSet.id))
      .where(eq(imageSet.userId, u2));
    expect(u2Images.length).toBe(9);
    expect(u2Images.map((r) => r.image.url).sort()).toEqual(
      keys.map((k) => `${R2_PREFIX}${k}`).sort(),
    );
  });

  it("U1 publish → U2 fork → U1 deletes source imageSet → gallery still alive, R2 alive", async () => {
    const u1 = await createTestUser("xu-a");
    const u2 = await createTestUser("xu-b");
    const { setId } = await makeImageSet(u1, { hashBase: `xu-${u1}` });
    const { path } = await catchRedirect(publish(u1, setId));
    const slug = path.split("/").pop()!;
    await catchRedirect(fork(u2, slug));
    r2State.deletedKeys = [];

    actingAs(u1);
    await ignoreRedirect(deleteImageSet(null, makeFormData({ setId })));
    // U2 image rows + gallery snapshot still hold refs.
    expect(r2State.deletedKeys).toEqual([]);

    const [gi] = await db
      .select()
      .from(galleryItem)
      .where(eq(galleryItem.slug, slug));
    expect(gi).toBeDefined();
    expect(gi.status).toBe("published");
  });

  it("U1 publish → U2 fork → U1 deletes BOTH source set and gallery → U2 untouched, R2 alive", async () => {
    const u1 = await createTestUser("xu-a");
    const u2 = await createTestUser("xu-b");
    const { setId, keys } = await makeImageSet(u1, { hashBase: `xu-${u1}` });
    const { path } = await catchRedirect(publish(u1, setId));
    const slug = path.split("/").pop()!;
    await catchRedirect(fork(u2, slug));
    r2State.deletedKeys = [];

    actingAs(u1);
    await ignoreRedirect(deleteImageSet(null, makeFormData({ setId })));
    await del(u1, slug);
    // Only U2's image rows remain → those are now the sole refs → R2 intact.
    expect(r2State.deletedKeys).toEqual([]);

    const u2Images = await db
      .select()
      .from(image)
      .innerJoin(imageSet, eq(image.imageSetId, imageSet.id))
      .where(eq(imageSet.userId, u2));
    expect(u2Images.length).toBe(9);
    expect(u2Images.map((r) => r.image.url).sort()).toEqual(
      keys.map((k) => `${R2_PREFIX}${k}`).sort(),
    );
  });

  it("U1 publish → U2 fork → U1 deletes account → U2 fork survives, R2 survives", async () => {
    const u1 = await createTestUser("xu-a");
    const u2 = await createTestUser("xu-b");
    const { setId, keys } = await makeImageSet(u1, { hashBase: `xu-${u1}` });
    const { path } = await catchRedirect(publish(u1, setId));
    const slug = path.split("/").pop()!;
    await catchRedirect(fork(u2, slug));
    r2State.deletedKeys = [];

    // U1 deletes account. U2's image rows are the only remaining refs.
    await cleanupUserOnDelete(u1);
    await db.delete(user).where(eq(user.id, u1));
    testUserIds.delete(u1);

    // Nothing should have been purged from R2 — U2 holds the refcount.
    expect(r2State.deletedKeys).toEqual([]);
    // Gallery item is gone (author deleted).
    const [gi] = await db
      .select()
      .from(galleryItem)
      .where(eq(galleryItem.slug, slug));
    expect(gi).toBeUndefined();
    // U2's image set is intact.
    const u2Images = await db
      .select()
      .from(image)
      .innerJoin(imageSet, eq(image.imageSetId, imageSet.id))
      .where(eq(imageSet.userId, u2));
    expect(u2Images.length).toBe(9);
    expect(u2Images.map((r) => r.image.url).sort()).toEqual(
      keys.map((k) => `${R2_PREFIX}${k}`).sort(),
    );
  });

  it("U1 publish → U1 deletes account → gallery item is gone (current behavior)", async () => {
    const u1 = await createTestUser("xu-a");
    const u2 = await createTestUser("xu-b");
    const { setId } = await makeImageSet(u1, { hashBase: `xu-${u1}` });
    const { path } = await catchRedirect(publish(u1, setId));
    const slug = path.split("/").pop()!;

    await cleanupUserOnDelete(u1);
    await db.delete(user).where(eq(user.id, u1));
    testUserIds.delete(u1);

    // Gallery row is deleted with the author.
    const [gi] = await db
      .select()
      .from(galleryItem)
      .where(eq(galleryItem.slug, slug));
    expect(gi).toBeUndefined();

    // U2 can no longer fork it.
    const res = await fork(u2, slug);
    expect(res?.errors?._?.[0]).toMatch(/not found|unpublished/i);
  });
});

// ══════════════════════════════════════════════════════════════════════
// Account-deletion R2 refcount
// ══════════════════════════════════════════════════════════════════════

describe("cleanupUserOnDelete (R2 refcount)", () => {
  it("purges all keys of a user with no overlap", async () => {
    const u = await createTestUser("acct");
    const { keys } = await makeImageSet(u, { hashBase: `acct-${u}` });
    r2State.deletedKeys = [];

    await cleanupUserOnDelete(u);
    await db.delete(user).where(eq(user.id, u));
    testUserIds.delete(u);

    expect(r2State.deletedKeys.sort()).toEqual([...keys].sort());
  });

  it("preserves keys another user shares via cross-user dedup", async () => {
    const u1 = await createTestUser("acct-a");
    const u2 = await createTestUser("acct-b");
    // Both users' sets share hashes → normally dedup would have them share
    // a URL, but for the refcount logic what matters is the contentHash
    // overlap, not the URL. We give u2 a DIFFERENT url per hash to make
    // the test explicit: only u1's urls should be candidates for deletion,
    // and even those are skipped because u2's image rows still claim the
    // same contentHashes.
    const u1Set = await makeImageSet(u1, { hashBase: "shared-acct" });

    // Insert u2's rows with the SAME hashes, different urls.
    const [u2SetRow] = await db
      .insert(imageSet)
      .values({ userId: u2, name: "u2-set" })
      .returning({ id: imageSet.id });
    for (let i = 0; i < 9; i++) {
      await db.insert(image).values({
        imageSetId: u2SetRow.id,
        url: `${R2_PREFIX}images/u2-${nanoid()}.webp`,
        name: `img-${i}`,
        contentHash: h(`shared-acct-${i}`),
        sizeBytes: 1024,
      });
    }
    r2State.deletedKeys = [];

    await cleanupUserOnDelete(u1);
    await db.delete(user).where(eq(user.id, u1));
    testUserIds.delete(u1);

    // u1's urls are all skipped — u2's image rows hold the contentHash refcount.
    expect(r2State.deletedKeys).toEqual([]);
    // Sanity: u1's hashes equal the ones in the u2 rows.
    expect(u1Set.hashes.sort()).toEqual(
      Array.from({ length: 9 }, (_, i) => h(`shared-acct-${i}`)).sort(),
    );
  });

  it("preserves a key when only another user's gallery_item snapshot references it", async () => {
    // u1 owns U1..U9 (hashes H1..H9). Another user's gallery_item
    // snapshot references U1 via H1. When u1 deletes their account, U1
    // must survive because gallery_item refcount holds it; U2..U9 are
    // unreferenced → purged.
    const u1 = await createTestUser("gr-a");
    const u2 = await createTestUser("gr-b");
    const u1Set = await makeImageSet(u1, { hashBase: `gr-${u1}` });

    // Build u2's gallery snapshot that references u1's U1 under H1, plus
    // 8 fresh hashes (with fresh urls) to satisfy the 9-image minimum.
    const snapshotImages = [
      {
        url: u1Set.urls[0],
        name: "borrowed",
        contentHash: u1Set.hashes[0],
        sizeBytes: 1024,
      },
      ...Array.from({ length: 8 }, (_, i) => ({
        url: `${R2_PREFIX}images/${nanoid()}.webp`,
        name: `fresh-${i}`,
        contentHash: h(`u2-fresh-${i}`),
        sizeBytes: 1024,
      })),
    ];
    await db.insert(galleryItem).values({
      authorId: u2,
      authorDisplayName: "U2",
      anonymous: false,
      title: "U2 item",
      description: null,
      images: snapshotImages,
      imagesHash: computeSetHash(snapshotImages.map((i) => i.contentHash)),
      status: "published",
    });

    r2State.deletedKeys = [];
    await cleanupUserOnDelete(u1);
    await db.delete(user).where(eq(user.id, u1));
    testUserIds.delete(u1);

    // U1's key is still referenced by u2's gallery_item → skipped.
    expect(r2State.deletedKeys).not.toContain(u1Set.keys[0]);
    // U2..U9 unreferenced → purged.
    for (const k of u1Set.keys.slice(1)) {
      expect(r2State.deletedKeys).toContain(k);
    }
  });

  it("purges audio unconditionally (no cross-user audio dedup)", async () => {
    const u = await createTestUser("acct-audio");
    const audioKey = `audio/${nanoid()}.wav`;
    await db.insert(audio).values({
      userId: u,
      url: `${R2_PREFIX}${audioKey}`,
      name: "bye",
      contentHash: h("audio"),
      sizeBytes: 1024,
    });
    r2State.deletedKeys = [];

    await cleanupUserOnDelete(u);
    await db.delete(user).where(eq(user.id, u));
    testUserIds.delete(u);

    expect(r2State.deletedKeys).toContain(audioKey);
  });

  it("never deletes R2 objects under /samples/", async () => {
    const u = await createTestUser("samples");
    const [set] = await db
      .insert(imageSet)
      .values({ userId: u, name: "samples set" })
      .returning({ id: imageSet.id });
    await db.insert(image).values({
      imageSetId: set.id,
      url: `${R2_PREFIX}samples/keep-me.webp`,
      name: "sample",
      contentHash: null,
      sizeBytes: 1024,
    });
    r2State.deletedKeys = [];

    await cleanupUserOnDelete(u);
    await db.delete(user).where(eq(user.id, u));
    testUserIds.delete(u);

    expect(r2State.deletedKeys).not.toContain("samples/keep-me.webp");
  });
});

// ══════════════════════════════════════════════════════════════════════
// Concurrent fork — same user double-submit can't produce two identical
// forked sets (M1 from the earlier race-condition review)
// ══════════════════════════════════════════════════════════════════════

describe("Race conditions", () => {
  it("same user double-forking the same gallery item yields at most one new set", async () => {
    const u1 = await createTestUser("race-a");
    const u2 = await createTestUser("race-b");
    const { setId } = await makeImageSet(u1, { hashBase: `race-${u1}` });
    const { path } = await catchRedirect(publish(u1, setId));
    const slug = path.split("/").pop()!;

    const [a, b] = await Promise.all([
      fork(u2, slug).catch((e) => e),
      fork(u2, slug).catch((e) => e),
    ]);

    const redirects = [a, b].filter(
      (r) => r instanceof Error && r.message === "NEXT_REDIRECT",
    );
    const alreadyHave = [a, b].filter(
      (r) =>
        !(r instanceof Error) &&
        typeof r === "object" &&
        r !== null &&
        "errors" in r &&
        /already have/i.test(
          (r as { errors?: { _?: string[] } }).errors?._?.[0] ?? "",
        ),
    );
    expect(redirects.length).toBe(1);
    expect(alreadyHave.length).toBe(1);

    // Only one image_set was created for u2.
    const u2Sets = await db
      .select()
      .from(imageSet)
      .where(eq(imageSet.userId, u2));
    expect(u2Sets.length).toBe(1);

    // downloadCount was incremented exactly once.
    const [gi] = await db
      .select()
      .from(galleryItem)
      .where(eq(galleryItem.slug, slug));
    expect(gi.downloadCount).toBe(1);
  });
});
