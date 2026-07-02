import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { audio, site } from "@/lib/db/app-schema";
import type { CaptchaMode } from "@/lib/types";
import { CreatePuzzleForm } from "./create-puzzle-form";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ siteId?: string; from?: string }>;
}) {
  const [session, params] = await Promise.all([requireSession(), searchParams]);
  const fromId = params.from;

  const [sites, imageSets, audioClips, sourcePuzzle] = await Promise.all([
    db
      .select({ id: site.id, name: site.name })
      .from(site)
      .where(eq(site.userId, session.user.id)),
    db.query.imageSet.findMany({
      where: (is, { eq: e }) => e(is.userId, session.user.id),
      with: { images: true },
      orderBy: (is, { desc }) => desc(is.createdAt),
    }),
    db
      .select({ id: audio.id, name: audio.name, url: audio.url })
      .from(audio)
      .where(eq(audio.userId, session.user.id))
      .orderBy(audio.createdAt),
    fromId
      ? db.query.puzzle.findFirst({
          where: (p, { eq: e }) => e(p.id, fromId),
          with: { site: true },
        })
      : Promise.resolve(null),
  ]);

  // Duplicate flow: prefill from the source puzzle, but only if it belongs to
  // this user, and only with image/audio ids that still exist — stale ids
  // would fail createPuzzle's ownership validation on submit.
  const source =
    sourcePuzzle && sourcePuzzle.site.userId === session.user.id
      ? sourcePuzzle
      : null;

  let defaultValues:
    | React.ComponentProps<typeof CreatePuzzleForm>["defaultValues"]
    | undefined;
  if (source) {
    const setImageIds = new Set(
      imageSets
        .find((is) => is.id === source.imageSetId)
        ?.images.map((img) => img.id) ?? [],
    );
    defaultValues = {
      captchaMode: source.captchaMode as CaptchaMode,
      imageSetId: source.imageSetId ?? "",
      prompt: source.prompt,
      correctImageIds: source.correctImageIds.filter((id) =>
        setImageIds.has(id),
      ),
      incorrectImageIds:
        source.incorrectImageIds?.filter((id) => setImageIds.has(id)) ?? null,
      correctCount: source.correctCount,
      correctCountMax: source.correctCountMax,
      difficulty: source.difficulty,
      audioId: audioClips.some((clip) => clip.id === source.audioId)
        ? (source.audioId ?? "")
        : "",
      audioAnswer: source.audioAnswer ?? "",
    };
  }

  return (
    <CreatePuzzleForm
      sites={sites}
      defaultSiteId={params.siteId}
      defaultValues={defaultValues}
      imageSets={imageSets.map((is) => ({
        id: is.id,
        name: is.name,
        images: is.images.map((img) => ({
          id: img.id,
          url: img.url,
          name: img.name,
        })),
      }))}
      audioClips={audioClips}
    />
  );
}
