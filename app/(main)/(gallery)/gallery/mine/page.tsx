import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { galleryItem } from "@/lib/db/app-schema";
import { GalleryItemCardContent } from "../gallery-item-card";
import { MineActions } from "./mine-actions";

export const dynamic = "force-dynamic";

export default async function GalleryMinePage() {
  const session = await requireSession();

  const items = await db
    .select()
    .from(galleryItem)
    .where(
      and(
        eq(galleryItem.authorId, session.user.id),
        eq(galleryItem.status, "published"),
      ),
    )
    .orderBy(desc(galleryItem.createdAt));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-8 lg:py-14">
      <header className="mb-8 flex flex-col gap-2 lg:mb-12">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400">
          Your gallery items
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-tight lg:text-[40px]">
          Everything you've published.
        </h1>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-background/50 px-8 py-20 text-center">
          <div className="max-w-sm">
            <div className="font-heading text-lg font-semibold">
              Nothing published yet
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Head to your image sets and pick one to publish. You'll confirm
              the images before anything goes public.
            </p>
          </div>
          <Button asChild size="sm" className="rounded-full">
            <Link href="/dashboard/image-sets">Go to image sets</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <MineCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

type Item = typeof galleryItem.$inferSelect;

function MineCard({ item }: { item: Item }) {
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background/70 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg">
      <Link
        href={`/gallery/${item.slug}`}
        className="flex flex-1 flex-col gap-3 p-3"
      >
        <GalleryItemCardContent item={item} />
      </Link>
      <MineActions slug={item.slug} />
    </div>
  );
}
