import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { galleryItem } from "@/lib/db/app-schema";
import { ForkButton } from "./fork-button";

export const dynamic = "force-dynamic";

const getItem = cache(async (slug: string) => {
  const [row] = await db
    .select()
    .from(galleryItem)
    .where(and(eq(galleryItem.slug, slug), eq(galleryItem.status, "published")))
    .limit(1);
  return row ?? null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getItem(slug);
  if (!item) return { title: "Gallery · yCAPTCHA" };
  return {
    title: `${item.title} · yCAPTCHA Gallery`,
    description: item.description ?? undefined,
  };
}

export default async function GalleryItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [item, session] = await Promise.all([getItem(slug), getSession()]);
  if (!item) notFound();

  const isAuthor = session?.user?.id && session.user.id === item.authorId;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 lg:px-8 lg:py-14">
      <div className="mb-6">
        <Link
          href="/gallery"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All image sets
        </Link>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-14">
        {/* Image grid */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Images in this set
            </div>
            <div className="text-xs text-muted-foreground">
              {item.images.length} total
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 p-3">
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {item.images.map((img, i) => (
                <div
                  key={`${img.contentHash}-${i}`}
                  className="relative aspect-square overflow-hidden rounded-md bg-muted"
                >
                  <Image
                    src={img.url}
                    alt={img.name ?? ""}
                    fill
                    sizes="(max-width: 640px) 33vw, 150px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Meta + actions */}
        <aside className="flex flex-col gap-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400">
              <span className="inline-block size-1.5 rounded-full bg-amber-500" />
              Image set
            </div>
            <h1 className="font-heading text-3xl font-bold tracking-tight lg:text-[40px]">
              {item.title}
            </h1>
            <div className="mt-2 text-sm text-muted-foreground">
              by{" "}
              <span className="font-medium text-foreground/80">
                {item.anonymous ? "anonymous" : item.authorDisplayName}
              </span>
              {" · "}
              {new Date(item.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>

          {item.description && (
            <p className="text-sm leading-relaxed text-foreground/80">
              {item.description}
            </p>
          )}

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/gallery?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-background/80 p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {item.downloadCount} fork{item.downloadCount === 1 ? "" : "s"}
            </div>
            {isAuthor ? (
              <>
                <Button asChild size="lg" className="rounded-full">
                  <Link href="/gallery/mine">Manage in My items</Link>
                </Button>
                <p className="text-xs text-muted-foreground">
                  This is your image set. Manage it from My items to edit,
                  unpublish, or wire it to a site.
                </p>
              </>
            ) : session ? (
              <>
                <ForkButton slug={item.slug} />
                <p className="text-xs text-muted-foreground">
                  Forking copies every image into your account as a new image
                  set. From there, wire it to a site and set your own prompt +
                  correct images.
                </p>
              </>
            ) : (
              <>
                <Button asChild size="lg" className="rounded-full">
                  <Link href="/login">Sign in to fork</Link>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Forking copies this set into your account so you can build a
                  puzzle around it.
                </p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
