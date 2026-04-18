import { eq } from "drizzle-orm";
import { Volume2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { audio } from "@/lib/db/app-schema";
import { AudioCard } from "./audio-card";
import { UploadAudioDialog } from "./upload-audio-dialog";

export default async function Page() {
  const session = await requireSession();
  const t = await getTranslations("audio");

  const clips = await db
    .select({
      id: audio.id,
      name: audio.name,
      durationMs: audio.durationMs,
      createdAt: audio.createdAt,
    })
    .from(audio)
    .where(eq(audio.userId, session.user.id))
    .orderBy(audio.createdAt);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <UploadAudioDialog />
      </div>

      {clips.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <Volume2 className="size-10 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">{t("noAudioYet")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("noAudioDescription")}
          </p>
          <div className="mt-6">
            <UploadAudioDialog />
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clips.map((clip) => (
            <AudioCard
              key={clip.id}
              id={clip.id}
              name={clip.name}
              durationMs={clip.durationMs}
              createdAt={clip.createdAt.toLocaleDateString()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
