import { count, eq } from "drizzle-orm";
import { Images, Sparkles } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { image, imageSet } from "@/lib/db/app-schema";
import { CreateImageSetDialog } from "./create-image-set-dialog";
import { ImageSetCard } from "./image-set-card";

export default async function Page() {
  const session = await requireSession();
  const t = await getTranslations("imageSets");

  const [sets, imageCounts] = await Promise.all([
    db.query.imageSet.findMany({
      where: (is, { eq: e }) => e(is.userId, session.user.id),
      with: {
        images: {
          columns: { id: true, url: true, name: true },
          limit: 5,
          orderBy: (img, { asc }) => asc(img.createdAt),
        },
      },
      orderBy: (is, { desc }) => desc(is.createdAt),
    }),
    db
      .select({ imageSetId: image.imageSetId, count: count() })
      .from(image)
      .innerJoin(imageSet, eq(image.imageSetId, imageSet.id))
      .where(eq(imageSet.userId, session.user.id))
      .groupBy(image.imageSetId),
  ]);

  const countMap = new Map(imageCounts.map((r) => [r.imageSetId, r.count]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/gallery"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-amber-500/5 px-3 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-500/10 dark:text-amber-400"
          >
            <Sparkles className="size-3" />
            Browse gallery
          </Link>
          <CreateImageSetDialog />
        </div>
      </div>

      {sets.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <Images className="size-10 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">{t("noImageSetsYet")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("noImageSetsDescription")}
          </p>
          <div className="mt-6">
            <CreateImageSetDialog />
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map((s) => (
            <ImageSetCard
              key={s.id}
              id={s.id}
              name={s.name}
              imageCount={countMap.get(s.id) ?? 0}
              createdAt={s.createdAt.toLocaleDateString()}
              images={s.images}
            />
          ))}
        </div>
      )}
    </div>
  );
}
