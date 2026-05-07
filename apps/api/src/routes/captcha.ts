import { timingSafeEqual } from "node:crypto";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import { env } from "../env";
import { after } from "../lib/after";
import { recordEvent } from "../lib/analytics";
import {
  consumeChallengeSession,
  createChallengeSession,
  createVerifiedSession,
  deleteVerifiedSession,
  getChallengeSession,
  getVerifiedSession,
} from "../lib/captcha-session";
import { config } from "../lib/config";
import { db } from "../lib/db";
import { audio, image, puzzle, site } from "../lib/db/app-schema";
import { proxyS3Asset } from "../lib/s3";
import { CAPTCHA_GRID_SIZE } from "../lib/types";
import { shuffle } from "../lib/utils";
import { rateLimit } from "../middleware/rate-limit";

const captcha = new Hono()
  .post("/challenge", rateLimit("challenge"), async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body?.siteKey) {
      return c.json({ error: "Missing siteKey" }, 400);
    }

    const [siteData] = await db
      .select()
      .from(site)
      .where(eq(site.siteKey, body.siteKey));
    if (!siteData) {
      return c.json({ error: "Invalid siteKey" }, 404);
    }

    if (siteData.domain && !body.origin) {
      return c.json({ error: "Missing origin" }, 400);
    }
    if (siteData.domain && body.origin) {
      try {
        const parentHost = new URL(body.origin).hostname;
        const appHost = config.siteHostname;
        const isLocalhost =
          parentHost === "localhost" || parentHost === "127.0.0.1";
        if (
          !isLocalhost &&
          parentHost !== appHost &&
          parentHost !== siteData.domain &&
          !parentHost.endsWith(`.${siteData.domain}`)
        ) {
          return c.json({ error: "Domain not allowed for this siteKey" }, 403);
        }
      } catch {
        return c.json({ error: "Invalid origin" }, 400);
      }
    }

    const [puzzleData] = await db
      .select()
      .from(puzzle)
      .where(and(eq(puzzle.siteId, siteData.id), eq(puzzle.enabled, true)))
      .orderBy(sql`RANDOM()`)
      .limit(1);
    if (!puzzleData) {
      return c.json({ error: "No puzzles configured for this site" }, 404);
    }

    const mode = puzzleData.captchaMode;
    const needsImages = mode !== "audio";
    const needsAudio = mode !== "image";

    let allImages: { id: string; url: string }[] = [];
    let correctImages: { id: string; url: string }[] = [];

    if (needsImages && puzzleData.imageSetId) {
      const allCorrectIds = puzzleData.correctImageIds as string[];
      const min = puzzleData.correctCount;
      const max = puzzleData.correctCountMax ?? min;
      const correctCount = min + Math.floor(Math.random() * (max - min + 1));

      const selectedCorrectIds = shuffle(allCorrectIds).slice(0, correctCount);

      correctImages =
        selectedCorrectIds.length > 0
          ? await db
              .select({ id: image.id, url: image.url })
              .from(image)
              .where(
                and(
                  eq(image.imageSetId, puzzleData.imageSetId),
                  inArray(image.id, selectedCorrectIds),
                ),
              )
          : [];

      const neededIncorrect = CAPTCHA_GRID_SIZE - correctImages.length;
      let incorrectImages: { id: string; url: string }[] = [];

      if (puzzleData.incorrectImageIds) {
        const incorrectIds = puzzleData.incorrectImageIds as string[];
        incorrectImages = await db
          .select({ id: image.id, url: image.url })
          .from(image)
          .where(
            and(
              eq(image.imageSetId, puzzleData.imageSetId),
              inArray(image.id, incorrectIds),
              ...(selectedCorrectIds.length > 0
                ? [notInArray(image.id, selectedCorrectIds)]
                : []),
            ),
          )
          .orderBy(sql`RANDOM()`)
          .limit(neededIncorrect);
      } else {
        incorrectImages = await db
          .select({ id: image.id, url: image.url })
          .from(image)
          .where(
            and(
              eq(image.imageSetId, puzzleData.imageSetId),
              ...(allCorrectIds.length > 0
                ? [notInArray(image.id, allCorrectIds)]
                : []),
            ),
          )
          .orderBy(sql`RANDOM()`)
          .limit(neededIncorrect);
      }

      allImages = shuffle([...correctImages, ...incorrectImages]);

      if (allImages.length < CAPTCHA_GRID_SIZE) {
        return c.json(
          { error: "Not enough images configured for this puzzle" },
          500,
        );
      }
    }

    let audioUrl: string | undefined;
    let audioAnswer: string | undefined;
    if (needsAudio && puzzleData.audioId) {
      const [audioData] = await db
        .select({ url: audio.url })
        .from(audio)
        .where(eq(audio.id, puzzleData.audioId));
      if (audioData) {
        audioUrl = audioData.url;
        audioAnswer = puzzleData.audioAnswer ?? undefined;
      }
    }
    if (mode === "audio" && !audioUrl) {
      return c.json({ error: "Audio not configured for this puzzle" }, 500);
    }

    const token = await createChallengeSession({
      puzzleId: puzzleData.id,
      siteId: siteData.id,
      userId: siteData.userId,
      imageUrls: allImages.map((img) => img.url),
      imageIds: allImages.map((img) => img.id),
      correctImageIds: correctImages.map((img) => img.id),
      correctCount: correctImages.length,
      difficulty: puzzleData.difficulty,
      ...(audioUrl && { audioUrl }),
      ...(audioAnswer && { audioAnswer }),
    });

    after(() =>
      recordEvent({
        userId: siteData.userId,
        siteId: siteData.id,
        puzzleId: puzzleData.id,
        eventType: "challenge",
      }),
    );

    return c.json({
      sessionToken: token,
      captchaMode: mode,
      prompt: puzzleData.prompt,
      ...(needsImages && {
        images: allImages.map((_, i) => ({
          url: `/api/v0/captcha/image/${token}/${i}`,
        })),
      }),
      audioEnabled: !!audioUrl,
    });
  })
  .post("/verify", rateLimit("verify"), async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body?.sessionToken) {
      return c.json({ error: "Missing sessionToken" }, 400);
    }
    const sessionToken = body.sessionToken as string;

    const hasAudioAnswer = typeof body.textAnswer === "string";
    const hasImageAnswer = Array.isArray(body.selectedIndices);

    if (!hasAudioAnswer && !hasImageAnswer) {
      return c.json({ error: "Missing textAnswer or selectedIndices" }, 400);
    }

    let uniqueIndices: number[] | null = null;
    if (hasImageAnswer) {
      const selectedIndices = body.selectedIndices as number[];
      if (selectedIndices.length > CAPTCHA_GRID_SIZE) {
        return c.json({ error: "Invalid indices" }, 400);
      }
      uniqueIndices = [...new Set(selectedIndices)];
      if (
        uniqueIndices.some(
          (i) => !Number.isInteger(i) || i < 0 || i >= CAPTCHA_GRID_SIZE,
        )
      ) {
        return c.json({ error: "Invalid indices" }, 400);
      }
    }

    const session = await consumeChallengeSession(sessionToken);
    if (!session) {
      return c.json(
        { success: false, error: "Invalid or expired session" },
        400,
      );
    }

    const eventBase = {
      userId: session.userId,
      siteId: session.siteId,
      puzzleId: session.puzzleId,
    };

    // Derive the puzzle's required modes from the stored session, not the
    // client payload. A "combined" puzzle has both audio answer and correct
    // images set; clients must clear both halves.
    const requiresAudio = !!session.audioAnswer;
    const requiresImage = session.correctImageIds.length > 0;

    if (requiresAudio && !hasAudioAnswer) {
      after(() => recordEvent({ ...eventBase, eventType: "fail" }));
      return c.json({ success: false });
    }
    if (requiresImage && !hasImageAnswer) {
      after(() => recordEvent({ ...eventBase, eventType: "fail" }));
      return c.json({ success: false });
    }

    if (requiresAudio) {
      const textAnswer = (body.textAnswer as string).trim();
      if (textAnswer.length === 0) {
        after(() => recordEvent({ ...eventBase, eventType: "fail" }));
        return c.json({ success: false });
      }
      const a = Buffer.from(textAnswer.toLowerCase());
      // biome-ignore lint/style/noNonNullAssertion: requiresAudio guards this
      const b = Buffer.from(session.audioAnswer!.toLowerCase());
      const correct = a.length === b.length && timingSafeEqual(a, b);
      if (!correct) {
        after(() => recordEvent({ ...eventBase, eventType: "fail" }));
        return c.json({ success: false });
      }
    }

    if (requiresImage) {
      const indices = uniqueIndices ?? [];
      if (indices.length === 0) {
        after(() => recordEvent({ ...eventBase, eventType: "fail" }));
        return c.json({ success: false });
      }
      if (indices.length === CAPTCHA_GRID_SIZE) {
        after(() => recordEvent({ ...eventBase, eventType: "auto_fail" }));
        return c.json({ success: false });
      }
      const correctIds = new Set(session.correctImageIds);
      const selectedImageIds = indices.map((i) => session.imageIds[i]!);
      const selectedCorrectCount = selectedImageIds.filter((id) =>
        correctIds.has(id),
      ).length;
      const selectedWrongCount = selectedImageIds.length - selectedCorrectCount;
      const score = selectedCorrectCount - selectedWrongCount;
      const requiredCount = Math.max(
        1,
        Math.ceil(session.correctCount * session.difficulty),
      );
      if (score < requiredCount) {
        after(() => recordEvent({ ...eventBase, eventType: "fail" }));
        return c.json({ success: false });
      }
    }

    const verifyToken = await createVerifiedSession({
      puzzleId: session.puzzleId,
      siteId: session.siteId,
      userId: session.userId,
    });
    after(() => recordEvent({ ...eventBase, eventType: "pass" }));
    return c.json({ success: true, token: verifyToken });
  })
  .post("/siteverify", rateLimit("siteverify"), async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body?.token || !body?.secretKey) {
      return c.json(
        { success: false, error: "Missing token or secretKey" },
        400,
      );
    }
    const { token, secretKey } = body as { token: string; secretKey: string };

    const session = await getVerifiedSession(token);
    if (!session) {
      return c.json({ success: false, error: "Invalid token" });
    }

    let owner: { siteId: string } | undefined;
    try {
      [owner] = await db
        .select({ siteId: site.id })
        .from(puzzle)
        .innerJoin(
          site,
          and(eq(site.id, puzzle.siteId), eq(site.secretKey, secretKey)),
        )
        .where(eq(puzzle.id, session.puzzleId));
    } catch {
      return c.json(
        { success: false, error: "Internal error, please retry" },
        500,
      );
    }
    if (!owner) {
      return c.json({ success: false, error: "Invalid secretKey" });
    }

    await deleteVerifiedSession(token);

    after(() =>
      recordEvent({
        userId: session.userId,
        siteId: session.siteId,
        puzzleId: session.puzzleId,
        eventType: "siteverify",
      }),
    );

    return c.json({ success: true });
  })
  .get("/image/:sessionToken/:index", rateLimit("image"), async (c) => {
    const sessionToken = c.req.param("sessionToken");
    const indexStr = c.req.param("index");
    const index = parseInt(indexStr, 10);
    if (Number.isNaN(index) || index < 0 || index >= CAPTCHA_GRID_SIZE) {
      return c.text("Invalid index", 400);
    }

    const session = await getChallengeSession(sessionToken);
    if (!session) return c.text("Session not found or expired", 404);

    const url = session.imageUrls[index];
    if (!url) return c.text("Index out of range", 400);
    if (!url.startsWith(`${env.S3_PUBLIC_URL}/`)) {
      return c.text("Invalid image source", 403);
    }

    const upstream = await fetch(url);
    if (!upstream.ok) return c.text("Image not found", 502);

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "image/webp",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  })
  .get("/audio/:sessionToken", rateLimit("audio"), async (c) => {
    const sessionToken = c.req.param("sessionToken");
    const session = await getChallengeSession(sessionToken);
    if (!session) return c.text("Session not found or expired", 404);
    if (!session.audioUrl) {
      return c.text("No audio configured for this session", 404);
    }
    return proxyS3Asset(session.audioUrl, "audio/wav");
  });

export { captcha };
