import { after } from "next/server";
import { recordEvent } from "@/lib/analytics";
import {
  consumeChallengeSession,
  createVerifiedSession,
} from "@/lib/captcha-session";
import { checkRateLimit, rateLimiters } from "@/lib/rate-limit";
import { CAPTCHA_GRID_SIZE } from "@/lib/types";

export async function POST(request: Request) {
  const limited = await checkRateLimit(rateLimiters.verify, request);
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  if (!body?.sessionToken) {
    return Response.json({ error: "Missing sessionToken" }, { status: 400 });
  }

  const { sessionToken } = body as { sessionToken: string };

  // Detect mode: audio (textAnswer) vs image (selectedIndices)
  const isAudioMode = typeof body.textAnswer === "string";
  const isImageMode = Array.isArray(body.selectedIndices);

  if (!isAudioMode && !isImageMode) {
    return Response.json(
      { error: "Missing textAnswer or selectedIndices" },
      { status: 400 },
    );
  }

  // Validate image indices BEFORE consuming the session — malformed requests
  // shouldn't burn a legit user's token.
  let uniqueIndices: number[] | null = null;
  if (isImageMode) {
    const { selectedIndices } = body as { selectedIndices: number[] };
    if (selectedIndices.length > CAPTCHA_GRID_SIZE) {
      return Response.json({ error: "Invalid indices" }, { status: 400 });
    }
    uniqueIndices = [...new Set(selectedIndices)];
    if (
      uniqueIndices.some(
        (i) => !Number.isInteger(i) || i < 0 || i >= CAPTCHA_GRID_SIZE,
      )
    ) {
      return Response.json({ error: "Invalid indices" }, { status: 400 });
    }
  }

  const session = await consumeChallengeSession(sessionToken);
  if (!session) {
    return Response.json(
      { success: false, error: "Invalid or expired session" },
      { status: 400 },
    );
  }

  const eventBase = {
    userId: session.userId,
    siteId: session.siteId,
    puzzleId: session.puzzleId,
  };

  // --- Audio verification ---
  if (isAudioMode) {
    const textAnswer = (body.textAnswer as string).trim();

    if (!session.audioAnswer) {
      return Response.json(
        { error: "Audio not configured for this session" },
        { status: 400 },
      );
    }

    const correct =
      textAnswer.length > 0 &&
      textAnswer.toLowerCase() === session.audioAnswer.toLowerCase();

    if (!correct) {
      after(() => recordEvent({ ...eventBase, eventType: "fail" }));
      return Response.json({ success: false });
    }

    const verifyToken = await createVerifiedSession({
      puzzleId: session.puzzleId,
      siteId: session.siteId,
      userId: session.userId,
    });

    after(() => recordEvent({ ...eventBase, eventType: "pass" }));
    return Response.json({ success: true, token: verifyToken });
  }

  // --- Image verification ---
  // uniqueIndices is non-null here because isImageMode === true.
  const indices = uniqueIndices as number[];

  // anti-bot: selecting every tile is never legitimate
  if (indices.length === CAPTCHA_GRID_SIZE) {
    after(() => recordEvent({ ...eventBase, eventType: "auto_fail" }));
    return Response.json({ success: false });
  }

  if (indices.length === 0) {
    after(() => recordEvent({ ...eventBase, eventType: "fail" }));
    return Response.json({ success: false });
  }

  const correctIds = new Set(session.correctImageIds);
  const selectedImageIds = indices.map((i) => session.imageIds[i]);

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
    return Response.json({ success: false });
  }

  const verifyToken = await createVerifiedSession({
    puzzleId: session.puzzleId,
    siteId: session.siteId,
    userId: session.userId,
  });

  after(() => recordEvent({ ...eventBase, eventType: "pass" }));
  return Response.json({ success: true, token: verifyToken });
}
