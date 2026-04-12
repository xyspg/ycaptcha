import { count, eq } from "drizzle-orm";
import { Images } from "lucide-react";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { image, imageSet } from "@/lib/db/app-schema";
import { CreateImageSetDialog } from "./create-image-set-dialog";
import { ImageSetCard } from "./image-set-card";
import { SampleSets } from "./sample-sets";

export default async function Page() {
  const session = await requireSession();

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
        <h1 className="text-2xl font-semibold">Image Sets</h1>
        <CreateImageSetDialog />
      </div>

      {sets.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <Images className="size-10 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No image sets yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create an image set and upload images to use in puzzles.
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

      <SampleSets />
    </div>
  );
}
