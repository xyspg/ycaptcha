import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AudioDetail } from "./audio-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ audioId: string }>;
}) {
  const [session, { audioId }] = await Promise.all([requireSession(), params]);

  const row = await db.query.audio.findFirst({
    where: (a, { and: all, eq: e }) =>
      all(e(a.id, audioId), e(a.userId, session.user.id)),
  });

  if (!row) notFound();

  return (
    <AudioDetail
      audio={{
        id: row.id,
        name: row.name,
        url: row.url,
        durationMs: row.durationMs,
      }}
    />
  );
}
