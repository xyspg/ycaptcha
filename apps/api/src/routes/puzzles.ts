import { zValidator } from "@hono/zod-validator";
import { and, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../lib/db";
import { audio, image, imageSet, puzzle, site } from "../lib/db/app-schema";
import { type AuthVariables, requireSession } from "../middleware/auth";
import {
  createPuzzleSchema,
  togglePuzzleSchema,
  updatePuzzleSchema,
} from "../schemas/puzzles";

async function requireOwnedPuzzle(puzzleId: string, userId: string) {
  const [row] = await db
    .select({ id: puzzle.id, siteId: puzzle.siteId })
    .from(puzzle)
    .innerJoin(site, and(eq(site.id, puzzle.siteId), eq(site.userId, userId)))
    .where(eq(puzzle.id, puzzleId));
  return row ?? null;
}

function ownedPuzzleWhere(puzzleId: string, userId: string) {
  return and(
    eq(puzzle.id, puzzleId),
    inArray(
      puzzle.siteId,
      db.select({ id: site.id }).from(site).where(eq(site.userId, userId)),
    ),
  );
}

async function validateImagesAndAudio(
  data: {
    captchaMode: "image" | "audio" | "combined";
    imageSetId: string;
    correctImageIds: string[];
    incorrectImageIds: string[] | null;
    audioId: string | null;
  },
  userId: string,
): Promise<{ ok: true } | { ok: false; field: string; message: string }> {
  const needsImages = data.captchaMode !== "audio";
  const needsAudio = data.captchaMode !== "image";

  if (needsImages) {
    const [setData] = await db
      .select({ id: imageSet.id })
      .from(imageSet)
      .where(
        and(eq(imageSet.id, data.imageSetId), eq(imageSet.userId, userId)),
      );
    if (!setData) {
      return { ok: false, field: "imageSetId", message: "Image set not found" };
    }
    const allImageIds = [
      ...data.correctImageIds,
      ...(data.incorrectImageIds ?? []),
    ];
    if (allImageIds.length > 0) {
      const valid = await db
        .select({ id: image.id })
        .from(image)
        .where(
          and(
            eq(image.imageSetId, data.imageSetId),
            inArray(image.id, allImageIds),
          ),
        );
      if (valid.length !== new Set(allImageIds).size) {
        return {
          ok: false,
          field: "correctImageIds",
          message: "Some images do not belong to the selected image set",
        };
      }
    }
  }

  if (needsAudio && data.audioId) {
    const [audioData] = await db
      .select({ id: audio.id })
      .from(audio)
      .where(and(eq(audio.id, data.audioId), eq(audio.userId, userId)));
    if (!audioData) {
      return { ok: false, field: "audioId", message: "Audio clip not found" };
    }
  }

  return { ok: true };
}

const puzzles = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireSession)
  .get("/", async (c) => {
    const user = c.get("user");
    const rows = await db
      .select({ puzzle, site })
      .from(puzzle)
      .innerJoin(site, eq(site.id, puzzle.siteId))
      .where(eq(site.userId, user.id))
      .orderBy(puzzle.createdAt);
    return c.json({ puzzles: rows });
  })
  .get("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const [row] = await db
      .select()
      .from(puzzle)
      .innerJoin(
        site,
        and(eq(site.id, puzzle.siteId), eq(site.userId, user.id)),
      )
      .where(eq(puzzle.id, id));
    if (!row) return c.json({ error: "Puzzle not found" }, 404);
    return c.json({ puzzle: row.puzzle, site: row.site });
  })
  .post("/", zValidator("json", createPuzzleSchema), async (c) => {
    const user = c.get("user");
    const data = c.req.valid("json");

    const [siteData] = await db
      .select({ id: site.id })
      .from(site)
      .where(and(eq(site.id, data.siteId), eq(site.userId, user.id)));
    if (!siteData) {
      return c.json({ error: "Site not found" }, 404);
    }

    const validation = await validateImagesAndAudio(data, user.id);
    if (!validation.ok) {
      return c.json(
        {
          error: "Validation failed",
          details: { [validation.field]: [validation.message] },
        },
        400,
      );
    }

    const needsImages = data.captchaMode !== "audio";
    const needsAudio = data.captchaMode !== "image";

    const [row] = await db
      .insert(puzzle)
      .values({
        siteId: data.siteId,
        captchaMode: data.captchaMode,
        imageSetId: needsImages ? data.imageSetId : null,
        prompt: data.prompt,
        correctImageIds: needsImages ? data.correctImageIds : [],
        incorrectImageIds: needsImages ? data.incorrectImageIds : null,
        correctCount: data.correctCount,
        correctCountMax: data.correctCountMax,
        difficulty: data.difficulty,
        audioId: needsAudio ? data.audioId : null,
        audioAnswer: needsAudio ? data.audioAnswer : null,
      })
      .returning();

    return c.json({ puzzle: row, message: "Puzzle created" }, 201);
  })
  .patch("/:id", zValidator("json", updatePuzzleSchema), async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const data = c.req.valid("json");

    const owned = await requireOwnedPuzzle(id, user.id);
    if (!owned) return c.json({ error: "Puzzle not found" }, 404);

    const validation = await validateImagesAndAudio(data, user.id);
    if (!validation.ok) {
      return c.json(
        {
          error: "Validation failed",
          details: { [validation.field]: [validation.message] },
        },
        400,
      );
    }

    const needsImages = data.captchaMode !== "audio";
    const needsAudio = data.captchaMode !== "image";

    const [row] = await db
      .update(puzzle)
      .set({
        captchaMode: data.captchaMode,
        imageSetId: needsImages ? data.imageSetId : null,
        prompt: data.prompt,
        correctImageIds: needsImages ? data.correctImageIds : [],
        incorrectImageIds: needsImages ? data.incorrectImageIds : null,
        correctCount: data.correctCount,
        correctCountMax: data.correctCountMax,
        difficulty: data.difficulty,
        audioId: needsAudio ? data.audioId : null,
        audioAnswer: needsAudio ? data.audioAnswer : null,
      })
      .where(ownedPuzzleWhere(id, user.id))
      .returning();

    return c.json({ puzzle: row, message: "Puzzle updated" });
  })
  .post("/:id/toggle", zValidator("json", togglePuzzleSchema), async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const { enabled } = c.req.valid("json");

    const owned = await requireOwnedPuzzle(id, user.id);
    if (!owned) return c.json({ error: "Puzzle not found" }, 404);

    const [row] = await db
      .update(puzzle)
      .set({ enabled })
      .where(ownedPuzzleWhere(id, user.id))
      .returning();
    return c.json({ puzzle: row, message: enabled ? "Enabled" : "Disabled" });
  })
  .delete("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");

    const owned = await requireOwnedPuzzle(id, user.id);
    if (!owned) return c.json({ error: "Puzzle not found" }, 404);

    await db.delete(puzzle).where(ownedPuzzleWhere(id, user.id));
    return c.json({ message: "Puzzle deleted" });
  });

export { puzzles };
