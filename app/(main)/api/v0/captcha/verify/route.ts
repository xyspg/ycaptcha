import { NextResponse } from "next/server";
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
    return NextResponse.json(
      { error: "Missing sessionToken" },
      { status: 400 },
    );
  }

  const { sessionToken } = body as { sessionToken: string };

  // Detect mode: audio (textAnswer) vs image (selectedIndices)
  const isAudioMode = typeof body.textAnswer === "string";
  const isImageMode = Array.isArray(body.selectedIndices);

  if (!isAudioMode && !isImageMode) {
    return NextResponse.json(
      { error: "Missing textAnswer or selectedIndices" },
      { status: 400 },
    );
  }

  // --- Audio verification ---
  if (isAudioMode) {
    const textAnswer = (body.textAnswer as string).trim();
    if (textAnswer.length === 0) {
      return NextResponse.json({ success: false });
    }

    const session = await consumeChallengeSession(sessionToken);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired session" },
        { status: 400 },
      );
    }

    if (!session.audioAnswer) {
      return NextResponse.json(
        { error: "Audio not configured for this session" },
        { status: 400 },
      );
    }

    const correct =
      textAnswer.toLowerCase() === session.audioAnswer.toLowerCase();

    if (!correct) {
      return NextResponse.json({ success: false });
    }

    const verifyToken = await createVerifiedSession({
      puzzleId: session.puzzleId,
      siteId: session.siteId,
    });

    return NextResponse.json({ success: true, token: verifyToken });
  }

  // --- Image verification (existing flow) ---
  const { selectedIndices } = body as { selectedIndices: number[] };

  if (selectedIndices.length > CAPTCHA_GRID_SIZE) {
    return NextResponse.json({ error: "Invalid indices" }, { status: 400 });
  }

  const uniqueIndices = [...new Set(selectedIndices)];

  if (
    uniqueIndices.some(
      (i) => !Number.isInteger(i) || i < 0 || i >= CAPTCHA_GRID_SIZE,
    )
  ) {
    return NextResponse.json({ error: "Invalid indices" }, { status: 400 });
  }

  if (uniqueIndices.length === 0) {
    return NextResponse.json({ success: false });
  }

  // prevent brute force by selecting all
  if (uniqueIndices.length === CAPTCHA_GRID_SIZE) {
    return NextResponse.json({ success: false });
  }

  const session = await consumeChallengeSession(sessionToken);

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Invalid or expired session" },
      { status: 400 },
    );
  }

  const correctIds = new Set(session.correctImageIds);
  const selectedImageIds = uniqueIndices.map((i) => session.imageIds[i]);

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
    return NextResponse.json({ success: false });
  }

  const verifyToken = await createVerifiedSession({
    puzzleId: session.puzzleId,
    siteId: session.siteId,
  });

  return NextResponse.json({ success: true, token: verifyToken });
}
